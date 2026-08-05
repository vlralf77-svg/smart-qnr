// PDF 페이지의 표 셀(칸) 영역 추출 (렌더러 전용)
//  - 표 선은 렌더러/원본 프로그램에 따라 두 가지로 그려진다:
//     (a) 얇은 사각형(OPS.rectangle) — Chromium 등
//     (b) 선분 stroke(moveTo/lineTo) — 한글(HWP)/Word export 등 대부분의 실제 문서
//  - 두 방식 모두에서 수평/수직 격자선을 모아 인접 격자선으로 셀을 재구성한다.
//  - 결과는 캔버스(px) 기준. 호출부에서 % 로 변환한다.
import * as pdfjsLib from 'pdfjs-dist';

interface Rect {
  left: number;
  top: number;
  w: number;
  h: number;
}
interface Seg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
interface HLine {
  x1: number;
  x2: number;
  y: number;
}
interface VLine {
  y1: number;
  y2: number;
  x: number;
}

// path 서브연산자별 좌표 소비 개수
const PATH_ARGS: Record<number, number> = {
  13: 2, // moveTo
  14: 2, // lineTo
  15: 6, // curveTo
  16: 4, // curveTo2
  17: 4, // curveTo3
  18: 0, // closePath
  19: 4, // rectangle
};

interface Collected {
  segs: Seg[]; // 선분(사각형 테두리 + stroke 선)
  rects: Rect[]; // 채워진 사각형(배경 필터·셀 후보 검증용)
}

/** 연산자 목록을 순회하며 그려진 선분/사각형을 캔버스 좌표로 수집 */
function collectGeometry(
  opList: { fnArray: number[]; argsArray: unknown[] },
  baseTransform: number[],
): Collected {
  const OPS = pdfjsLib.OPS as unknown as Record<string, number>;
  const Util = pdfjsLib.Util as unknown as {
    transform: (a: number[], b: number[]) => number[];
    applyTransform: (p: number[], m: number[]) => number[];
  };

  const segs: Seg[] = [];
  const rects: Rect[] = [];
  let ctm: number[] = [1, 0, 0, 1, 0, 0];
  const stack: number[][] = [];

  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i] as unknown;

    if (fn === OPS.save) {
      stack.push(ctm.slice());
    } else if (fn === OPS.restore) {
      ctm = stack.pop() ?? ctm;
    } else if (fn === OPS.transform) {
      ctm = Util.transform(ctm, args as number[]);
    } else if (fn === OPS.constructPath) {
      const a = args as [number[], number[]];
      const ops = a[0] || [];
      const coords = a[1] || [];
      const full = Util.transform(baseTransform, ctm);
      const apply = (x: number, y: number) => Util.applyTransform([x, y], full);

      let cur: number[] | null = null; // 현재 펜 위치(캔버스 px)
      let start: number[] | null = null; // 서브패스 시작점
      let ci = 0;
      for (const sub of ops) {
        const n = PATH_ARGS[sub] ?? 0;
        if (sub === OPS.moveTo) {
          cur = apply(coords[ci], coords[ci + 1]);
          start = cur;
        } else if (sub === OPS.lineTo) {
          const p = apply(coords[ci], coords[ci + 1]);
          if (cur) segs.push({ x1: cur[0], y1: cur[1], x2: p[0], y2: p[1] });
          cur = p;
        } else if (sub === OPS.curveTo) {
          cur = apply(coords[ci + 4], coords[ci + 5]);
        } else if (sub === OPS.curveTo2 || sub === OPS.curveTo3) {
          cur = apply(coords[ci + 2], coords[ci + 3]);
        } else if (sub === OPS.closePath) {
          if (cur && start) segs.push({ x1: cur[0], y1: cur[1], x2: start[0], y2: start[1] });
          cur = start;
        } else if (sub === OPS.rectangle) {
          const x = coords[ci];
          const y = coords[ci + 1];
          const w = coords[ci + 2];
          const h = coords[ci + 3];
          const p1 = apply(x, y);
          const p2 = apply(x + w, y + h);
          const left = Math.min(p1[0], p2[0]);
          const top = Math.min(p1[1], p2[1]);
          const rw = Math.abs(p2[0] - p1[0]);
          const rh = Math.abs(p2[1] - p1[1]);
          rects.push({ left, top, w: rw, h: rh });
          // 사각형 4변을 선분으로도 등록(테두리로 그린 표 대응)
          segs.push({ x1: left, y1: top, x2: left + rw, y2: top }); // 상
          segs.push({ x1: left, y1: top + rh, x2: left + rw, y2: top + rh }); // 하
          segs.push({ x1: left, y1: top, x2: left, y2: top + rh }); // 좌
          segs.push({ x1: left + rw, y1: top, x2: left + rw, y2: top + rh }); // 우
        }
        ci += n;
      }
    }
  }
  return { segs, rects };
}

function cluster(values: number[], tol: number): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const out: number[] = [];
  for (const v of sorted) {
    if (out.length === 0 || v - out[out.length - 1] > tol) out.push(v);
    else out[out.length - 1] = (out[out.length - 1] + v) / 2;
  }
  return out;
}

/** 표 셀 재구성 → 캔버스(px) 사각형 목록 */
export async function extractTableCells(
  page: { getOperatorList: () => Promise<{ fnArray: number[]; argsArray: unknown[] }> },
  viewport: { transform: number[]; width: number; height: number },
): Promise<Rect[]> {
  let geom: Collected;
  try {
    const opList = await page.getOperatorList();
    geom = collectGeometry(opList, viewport.transform);
  } catch {
    return [];
  }
  const canvasW = viewport.width;
  const tol = Math.max(3, canvasW * 0.004);
  const thin = tol * 1.6; // 선 두께/기울기로 볼 최대 px
  const minLen = tol * 2; // 격자선으로 인정할 최소 길이

  const hLines: HLine[] = [];
  const vLines: VLine[] = [];

  // (a) 선분: 거의 수평/수직인 것만 격자선으로
  for (const s of geom.segs) {
    const dx = Math.abs(s.x2 - s.x1);
    const dy = Math.abs(s.y2 - s.y1);
    if (dy <= thin && dx >= minLen) {
      const y = (s.y1 + s.y2) / 2;
      hLines.push({ x1: Math.min(s.x1, s.x2), x2: Math.max(s.x1, s.x2), y });
    } else if (dx <= thin && dy >= minLen) {
      const x = (s.x1 + s.x2) / 2;
      vLines.push({ y1: Math.min(s.y1, s.y2), y2: Math.max(s.y1, s.y2), x });
    }
  }

  if (hLines.length < 2 || vLines.length < 2) return [];

  const xs = cluster(
    vLines.map((l) => l.x),
    tol,
  );
  const ys = cluster(
    hLines.map((l) => l.y),
    tol,
  );
  if (xs.length < 2 || ys.length < 2 || xs.length > 80 || ys.length > 120) return [];

  const hasH = (y: number, a: number, b: number) =>
    hLines.some((l) => Math.abs(l.y - y) <= tol && l.x1 <= a + tol && l.x2 >= b - tol);
  const hasV = (x: number, a: number, b: number) =>
    vLines.some((l) => Math.abs(l.x - x) <= tol && l.y1 <= a + tol && l.y2 >= b - tol);

  const cells: Rect[] = [];
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const a = xs[i];
      const b = xs[i + 1];
      const c = ys[j];
      const d = ys[j + 1];
      if (b - a < tol * 2 || d - c < tol * 1.2) continue;
      // 네 변 중 최소 3개가 선으로 둘러싸이면 셀로 인정
      let borders = 0;
      if (hasH(c, a, b)) borders++;
      if (hasH(d, a, b)) borders++;
      if (hasV(a, c, d)) borders++;
      if (hasV(b, c, d)) borders++;
      if (borders >= 3) cells.push({ left: a, top: c, w: b - a, h: d - c });
    }
  }
  return cells;
}

export type { Rect as CellRect };
