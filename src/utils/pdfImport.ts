// PDF → 오버레이 문진 변환 (렌더러 전용, 오픈소스 pdfjs)
//  - 각 페이지를 이미지로 렌더해 배경으로 저장
//  - 텍스트 좌표를 분석해 체크박스(□○)·빈칸(___)에 입력필드를 자동 배치(근사)
//  - 자동 배치가 완벽하지 않아도, 배경 PDF 위에서 드래그로 미세조정 가능
import * as pdfjsLib from 'pdfjs-dist';
import { CellRegion, FormPage, FormSchema, Question } from '@/types/schema';
import { extractTableCells } from './pdfCells';

// Vite 가 워커를 에셋으로 방출하고 URL 을 재작성한다(Electron file:// 에서도 동작).
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const RENDER_SCALE = 2; // 배경 이미지 해상도(선명도↑)

let seq = 0;
function uid(prefix: string): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}${seq.toString(36)}`;
}

// 체크 가능한 마커: 네모/동그라미 + 동그라미 숫자(①-⑳), 괄호숫자(⑴-⒇),
// 딩벳 동그라미(❶-❿, ➀-➓), ⓪, 체크표시 등
const CHECKBOX_RE =
  /[□○◯▢☐■◻◼⬜⬛✓✔☑◇◆①-⑳⑴-⒇⓪❶-❿➀-➓]/gu;
const MARKER_SPLIT_RE =
  /[\s]{2,}|[□○◯▢☐■◻◼⬜⬛✓✔☑◇◆①-⑳⑴-⒇⓪❶-❿➀-➓]/u;
const BLANK_RE = /_{3,}|\.{4,}/g; // 밑줄/점선 빈칸

interface DetectedField {
  type: 'boolean' | 'text';
  page: number;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  label: string;
}

interface TextItemLike {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

/** 텍스트 아이템의 캔버스(px) 바운딩박스 계산 */
function itemBBox(item: TextItemLike, viewportTransform: number[], scale: number) {
  const t = pdfjsLib.Util.transform(viewportTransform, item.transform);
  const fontHeight = Math.hypot(t[2], t[3]) || item.height * scale || 10;
  const left = t[4];
  const top = t[5] - fontHeight;
  const width = (item.width || 0) * scale;
  return { left, top, width, height: fontHeight };
}

function detectFieldsInPage(
  items: TextItemLike[],
  viewportTransform: number[],
  scale: number,
  canvasW: number,
  canvasH: number,
  pageIndex: number,
): DetectedField[] {
  const fields: DetectedField[] = [];
  const toPct = (bbox: { left: number; top: number; width: number; height: number }) => ({
    xPct: (bbox.left / canvasW) * 100,
    yPct: (bbox.top / canvasH) * 100,
    wPct: (bbox.width / canvasW) * 100,
    hPct: (bbox.height / canvasH) * 100,
  });

  for (const item of items) {
    if (!item.str || !item.str.trim()) continue;
    const bbox = itemBBox(item, viewportTransform, scale);
    if (bbox.width <= 0 || bbox.height <= 0) continue;

    const len = item.str.length || 1;
    const perChar = bbox.width / len;

    // 체크박스 글자 각각을 작은 정사각형 필드로
    let m: RegExpExecArray | null;
    CHECKBOX_RE.lastIndex = 0;
    while ((m = CHECKBOX_RE.exec(item.str)) !== null) {
      const idx = m.index;
      const cx = bbox.left + perChar * idx;
      const size = bbox.height * 1.1;
      // 라벨: 해당 글자 뒤 텍스트(같은 아이템 내, 다음 마커 전까지)
      const label = item.str.slice(idx + 1).trim().split(MARKER_SPLIT_RE)[0]?.trim() || '';
      const p = toPct({ left: cx, top: bbox.top, width: size, height: size });
      fields.push({ type: 'boolean', page: pageIndex, ...p, label });
    }

    // 빈칸(밑줄/점선)을 텍스트 입력필드로
    BLANK_RE.lastIndex = 0;
    while ((m = BLANK_RE.exec(item.str)) !== null) {
      const idx = m.index;
      const runW = perChar * m[0].length;
      const cx = bbox.left + perChar * idx;
      const p = toPct({ left: cx, top: bbox.top, width: runW, height: bbox.height * 1.4 });
      fields.push({ type: 'text', page: pageIndex, ...p, label: '' });
    }
  }
  return fields;
}

function detectedToQuestion(f: DetectedField): Question {
  const q: Question = {
    id: uid('q'),
    type: f.type,
    label: f.label || (f.type === 'boolean' ? '선택' : '입력'),
    required: false,
    overlay: {
      page: f.page,
      xPct: Math.max(0, f.xPct),
      yPct: Math.max(0, f.yPct),
      wPct: Math.min(100, Math.max(1.5, f.wPct)),
      hPct: Math.min(100, Math.max(1.5, f.hPct)),
    },
  };
  return q;
}

export interface PdfImportResult {
  schema: FormSchema;
  pageCount: number;
  fieldCount: number;
}

/** PDF 파일(ArrayBuffer) → 오버레이 문진 스키마 */
export async function pdfToOverlayForm(
  data: ArrayBuffer,
  fileName?: string,
): Promise<PdfImportResult> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(data) });
  const pdf = await loadingTask.promise;

  const pages: FormPage[] = [];
  const questions: Question[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: RENDER_SCALE });

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('캔버스 컨텍스트를 생성할 수 없습니다.');

    await page.render({ canvasContext: ctx, viewport }).promise;
    const image = canvas.toDataURL('image/png');
    const cw = canvas.width;
    const ch = canvas.height;

    // 표 셀(칸) 영역 추출 → % 로 저장(클릭 배치 시 자동 크기 스냅)
    let cells: CellRegion[] | undefined;
    try {
      const raw = await extractTableCells(page, {
        transform: viewport.transform,
        width: cw,
        height: ch,
      });
      cells = raw.map((r) => ({
        xPct: (r.left / cw) * 100,
        yPct: (r.top / ch) * 100,
        wPct: (r.w / cw) * 100,
        hPct: (r.h / ch) * 100,
      }));
    } catch {
      cells = undefined;
    }
    pages.push({ image, width: cw, height: ch, cells: cells && cells.length ? cells : undefined });

    const textContent = await page.getTextContent();
    const items: TextItemLike[] = textContent.items
      .filter((it) => typeof (it as { str?: unknown }).str === 'string')
      .map((it) => it as unknown as TextItemLike);
    const detected = detectFieldsInPage(
      items,
      viewport.transform,
      RENDER_SCALE,
      cw,
      ch,
      i - 1,
    );
    for (const f of detected) questions.push(detectedToQuestion(f));

    // 캔버스 메모리 정리
    canvas.width = 0;
    canvas.height = 0;
  }

  const now = new Date().toISOString();
  const schema: FormSchema = {
    id: `FORM_${now.slice(0, 10).replace(/-/g, '')}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    title: (fileName ? fileName.replace(/\.[^.]+$/, '') : '') || '변환된 PDF 문진(검수 필요)',
    description: '원본 PDF 위에 입력필드를 얹은 문진입니다. 자동 배치된 필드 위치·유형을 확인·조정하세요.',
    version: 1,
    status: 'draft',
    sections: [{ id: uid('sec'), title: '문항', questions }],
    pages,
    createdAt: now,
    updatedAt: now,
  };

  return { schema, pageCount: pdf.numPages, fieldCount: questions.length };
}
