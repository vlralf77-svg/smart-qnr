// PDF 페이지의 표 셀(칸) 영역 추출 (렌더러 전용)
//  - Chromium 등은 표 선을 얇은 사각형(OPS.rectangle)으로 그린다.
//  - 연산자 목록에서 선분을 모아 수평/수직 격자선을 만들고, 인접 격자선으로 셀을 재구성한다.
//  - 결과는 캔버스(px) 기준. 호출부에서 % 로 변환한다.
import * as pdfjsLib from 'pdfjs-dist';

interface Rect {
  left: number;
  top: number;
  w: number;
  h: number;
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

/** 연산자 목록을 순회하며 그려진 사각형들을 캔버스 좌표로 수집 */
function collectRects(
  opList: { fnArray: number[]; argsArray: unknown[] },
  baseTransform: number[],
): Rect[] {
  const OPS = pdfjsLib.OPS as unknown as Record<string, number>;
  const Util = pdfjsLib.Util as unknown as {
    transform: (a: number[], b: number[]) => number[];
    applyTransform: (p: number[], m: number[]) => number[];
  };

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
      let ci = 0;
      for (const sub of ops) {
        const n = PATH_ARGS[sub] ?? 0;
        if (sub === OPS.rectangle) {
          const x = coords[ci];
          const y = coords[ci + 1];
          const w = coords[ci + 2];
          const h = coords[ci + 3];
          const p1 = Util.applyTransform([x, y], full);
          const p2 = Util.applyTransform([x + w, y + h], full);
          rects.push({
            left: Math.min(p1[0], p2[0]),
            top: Math.min(p1[1], p2[1]),
            w: Math.abs(p2[0] - p1[0]),
            h: Math.abs(p2[1] - p1[1]),
          });
        }
        ci += n;
      }
    }
  }
  return rects;
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
  let rects: Rect[];
  try {
    const opList = await page.getOperatorList();
    rects = collectRects(opList, viewport.transform);
  } catch {
    return [];
  }
  const canvasW = viewport.width;
  const canvasH = viewport.height;
  const tol = Math.max(3, canvasW * 0.004);
  const thin = tol * 1.6; // 선 두께로 볼 최대 px

  const hLines: HLine[] = [];
  const vLines: VLine[] = [];
  for (const r of rects) {
    if (r.w > canvasW * 0.98 && r.h > canvasH * 0.98) continue; // 페이지 배경 제외
    if (r.h <= thin && r.w > thin) hLines.push({ x1: r.left, x2: r.left + r.w, y: r.top + r.h / 2 });
    else if (r.w <= thin && r.h > thin) vLines.push({ y1: r.top, y2: r.top + r.h, x: r.left + r.w / 2 });
  }
  if (hLines.length < 2 || vLines.length < 2) return [];

  const xs = cluster(vLines.map((l) => l.x), tol);
  const ys = cluster(hLines.map((l) => l.y), tol);
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
