// 엑셀(.xlsx) 문진 템플릿 → FormSchema 변환
//  템플릿 시트 '문진질문' 헤더:
//   질문ID | 섹션 | 순서 | 질문 | 응답유형 | 선택지 | 필수 | 표시조건 | 기타입력허용 | 비고
//  응답유형: SINGLE→radio, MULTI→checkbox, TEXT→text, NUMBER→number, DATE→date, SCALE→scale
import { unzipSync, strFromU8 } from 'fflate';
import {
  FormSchema,
  Question,
  QuestionCondition,
  QuestionOption,
  QuestionType,
  Section,
} from '@/types/schema';

// ---- 저수준 xlsx 파싱 (sharedStrings / inlineStr / 숫자 모두 처리) ----

function colToNum(ref: string): number {
  const m = /^([A-Z]+)/.exec(ref);
  if (!m) return 0;
  let n = 0;
  for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n; // 1-based
}

function decodeXml(s: string): string {
  return s
    .replace(/<[^>]+>/g, '') // 잔여 태그 제거(리치텍스트 run 등)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  const siRe = /<si>([\s\S]*?)<\/si>/g;
  let m: RegExpExecArray | null;
  while ((m = siRe.exec(xml))) {
    // <si> 안의 모든 <t>...</t> 를 이어붙임(리치텍스트 run 대응)
    const parts = [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]);
    out.push(decodeXml(parts.join('')));
  }
  return out;
}

type Grid = Map<number, Map<number, string>>; // row(1-based) → col(1-based) → value

function parseSheet(xml: string, shared: string[]): Grid {
  const grid: Grid = new Map();
  const rowRe = /<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let rm: RegExpExecArray | null;
  while ((rm = rowRe.exec(xml))) {
    const rowIdx = +rm[1];
    const cols = new Map<number, string>();
    const cellRe = /<c[^>]*r="([A-Z]+\d+)"([^>]*)>([\s\S]*?)<\/c>/g;
    let cm: RegExpExecArray | null;
    while ((cm = cellRe.exec(rm[2]))) {
      const col = colToNum(cm[1]);
      const attrs = cm[2];
      const inner = cm[3];
      const t = /\bt="([^"]+)"/.exec(attrs)?.[1];
      let val = '';
      if (t === 's') {
        const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
        val = v != null ? (shared[+v] ?? '') : '';
      } else if (t === 'inlineStr') {
        const is = /<is>([\s\S]*?)<\/is>/.exec(inner)?.[1] ?? '';
        const parts = [...is.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]);
        val = decodeXml(parts.join(''));
      } else if (t === 'str') {
        val = decodeXml(/<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? '');
      } else {
        val = decodeXml(/<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? '');
      }
      if (val !== '') cols.set(col, val.trim());
    }
    if (cols.size) grid.set(rowIdx, cols);
  }
  return grid;
}

// ---- 템플릿 → 스키마 매핑 ----

// 엑셀 응답유형 코드 → 프로그램 문항 유형. 영문 코드 + 한글 표기 모두 허용.
const TYPE_SYNONYMS: Record<QuestionType, string[]> = {
  radio: ['SINGLE', '단일선택', '단일 선택', '라디오'],
  checkbox: ['MULTI', 'MULTIPLE', '복수선택', '복수 선택', '체크박스'],
  select: ['SELECT', 'DROPDOWN', '드롭다운', '셀렉트'],
  text: ['TEXT', '단답형', '단답', '주관식'],
  textarea: ['TEXTAREA', 'LONGTEXT', 'LONG', '장문형', '장문'],
  number: ['NUMBER', 'NUM', '숫자'],
  date: ['DATE', '날짜'],
  boolean: ['BOOLEAN', 'BOOL', 'YESNO', '예/아니오', '예아니오'],
  scale: ['SCALE', '척도'],
  info: ['INFO', 'GUIDE', '안내문', '안내'],
  image: ['IMAGE', 'IMG', '이미지', '참고이미지'],
  signature: ['SIGNATURE', 'SIGN', '서명'],
};

const TYPE_MAP: Record<string, QuestionType> = (() => {
  const m: Record<string, QuestionType> = {};
  for (const [type, keys] of Object.entries(TYPE_SYNONYMS) as [QuestionType, string[]][]) {
    for (const k of keys) m[k.toUpperCase().replace(/\s+/g, '')] = type;
  }
  return m;
})();

/** 엑셀 셀 값 → 문항 유형(정규화). 못 찾으면 null */
function normalizeType(raw: string): QuestionType | null {
  return TYPE_MAP[(raw || '').toUpperCase().replace(/\s+/g, '')] ?? null;
}

const HEADER_KEYS = [
  '질문ID',
  '섹션',
  '순서',
  '질문',
  '응답유형',
  '선택지',
  '필수',
  '표시조건',
  '기타입력허용',
  '비고',
];

function slug(s: string): string {
  return (
    (s || '')
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'x'
  );
}

function parseCondition(raw: string): QuestionCondition | undefined {
  const s = (raw || '').trim();
  if (!s) return undefined;
  // 지원 형식: Qxxx=값, Qxxx!=값, Qxxx>값, Qxxx<값
  const m = /^([A-Za-z0-9_]+)\s*(!=|>=|<=|=|>|<)\s*(.+)$/.exec(s);
  if (!m) return undefined;
  const op = m[2];
  const operator: QuestionCondition['operator'] =
    op === '!='
      ? 'notEquals'
      : op === '>' || op === '>='
        ? 'greaterThan'
        : op === '<' || op === '<='
          ? 'lessThan'
          : 'equals';
  return { questionId: m[1], operator, value: m[3].trim() };
}

function options(raw: string): QuestionOption[] {
  return (raw || '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((label, i) => ({ id: `o${i + 1}`, label, value: label }));
}

interface ParseResult {
  schema: FormSchema;
  warnings: string[];
  questionCount: number;
}

export function parseExcelTemplate(buffer: ArrayBuffer, fileName = '문진'): ParseResult {
  const files = unzipSync(new Uint8Array(buffer));
  const get = (path: string) => (files[path] ? strFromU8(files[path]) : '');

  const shared = files['xl/sharedStrings.xml']
    ? parseSharedStrings(get('xl/sharedStrings.xml'))
    : [];

  // 워크북에서 '문진질문' 시트 찾기 → 없으면 헤더로 자동 탐지
  const workbook = get('xl/workbook.xml');
  const rels = get('xl/_rels/workbook.xml.rels');
  // <Relationship> 의 Id/Target 속성 순서가 파일마다 달라서(엑셀은 Target 먼저) 순서 무관하게 파싱
  const relMap = new Map<string, string>();
  for (const m of rels.matchAll(/<Relationship\b[^>]*\/?>/g)) {
    const tag = m[0];
    const id = /\bId="([^"]+)"/.exec(tag)?.[1];
    const target = /\bTarget="([^"]+)"/.exec(tag)?.[1];
    if (id && target) relMap.set(id, target.replace(/^\/?xl\//, '').replace(/^\.\//, ''));
  }
  const sheetTargets: { name: string; path: string }[] = [];
  for (const m of workbook.matchAll(/<sheet\b[^>]*\/?>/g)) {
    const tag = m[0];
    const name = /\bname="([^"]+)"/.exec(tag)?.[1];
    const rid = /\br:id="([^"]+)"/.exec(tag)?.[1];
    const target = rid ? relMap.get(rid) : undefined;
    if (name && target) sheetTargets.push({ name: decodeXml(name), path: 'xl/' + target });
  }

  const findGrid = (): Grid | null => {
    // 1) 이름이 '문진질문'인 시트 우선
    const named = sheetTargets.find((s) => s.name.includes('문진질문') || s.name.includes('질문'));
    const candidates = named ? [named, ...sheetTargets] : sheetTargets;
    for (const s of candidates) {
      const xml = get(s.path);
      if (!xml) continue;
      const grid = parseSheet(xml, shared);
      // 헤더행(질문ID 포함) 있는지 확인
      for (const cols of grid.values()) {
        const vals = [...cols.values()];
        if (vals.includes('질문ID') && vals.includes('응답유형')) return grid;
      }
    }
    return null;
  };

  const grid = findGrid();
  if (!grid) {
    throw new Error("템플릿에서 '문진질문' 표를 찾지 못했습니다. 템플릿 양식을 확인해 주세요.");
  }

  // 헤더행 찾기 → 컬럼 인덱스 매핑
  let headerRow = -1;
  const colIdx: Record<string, number> = {};
  for (const [rowIdx, cols] of [...grid.entries()].sort((a, b) => a[0] - b[0])) {
    const vals = [...cols.values()];
    if (vals.includes('질문ID')) {
      headerRow = rowIdx;
      for (const [c, v] of cols) {
        const key = HEADER_KEYS.find((k) => v === k);
        if (key) colIdx[key] = c;
      }
      break;
    }
  }
  if (headerRow < 0) throw new Error('헤더행(질문ID …)을 찾지 못했습니다.');

  const warnings: string[] = [];
  interface Row {
    qid: string;
    section: string;
    order: number;
    label: string;
    typeRaw: string;
    optionsRaw: string;
    required: boolean;
    condRaw: string;
    allowEtc: boolean;
    note: string;
  }
  const rows: Row[] = [];
  const cell = (cols: Map<number, string>, key: string) =>
    colIdx[key] != null ? (cols.get(colIdx[key]) ?? '') : '';

  for (const [rowIdx, cols] of [...grid.entries()].sort((a, b) => a[0] - b[0])) {
    if (rowIdx <= headerRow) continue;
    const qid = cell(cols, '질문ID');
    const label = cell(cols, '질문');
    if (!qid && !label) continue; // 빈 행 스킵
    rows.push({
      qid: qid || `Q${rows.length + 1}`,
      section: cell(cols, '섹션') || '기본',
      order: Number(cell(cols, '순서')) || (rows.length + 1) * 10,
      label,
      typeRaw: (cell(cols, '응답유형') || 'TEXT').toUpperCase(),
      optionsRaw: cell(cols, '선택지'),
      required: /^y/i.test(cell(cols, '필수')),
      condRaw: cell(cols, '표시조건'),
      allowEtc: /^y/i.test(cell(cols, '기타입력허용')),
      note: cell(cols, '비고'),
    });
  }

  if (rows.length === 0) throw new Error('질문 데이터가 없습니다. (헤더 아래 행을 확인해 주세요)');

  // 섹션 그룹핑(첫 등장 순서 유지) + 순서 정렬
  const sectionOrder: string[] = [];
  const bySection = new Map<string, Question[]>();

  for (const r of rows) {
    const type = normalizeType(r.typeRaw);
    if (!type) {
      warnings.push(`${r.qid}: 알 수 없는 응답유형 '${r.typeRaw}' → 단답형으로 처리`);
    }
    const resolved: QuestionType = type ?? 'text';
    const q: Question = {
      id: r.qid,
      type: resolved,
      label: r.label,
      required: r.required || undefined,
    };

    if (resolved === 'radio' || resolved === 'checkbox' || resolved === 'select') {
      q.options = options(r.optionsRaw);
      if (q.options.length === 0) warnings.push(`${r.qid}: 선택지가 비어 있습니다.`);
      if (r.allowEtc) q.allowEtc = true;
    } else if (resolved === 'scale') {
      const [mn, mx] = r.optionsRaw.split('|').map((s) => Number(s.trim()));
      q.min = Number.isFinite(mn) ? mn : 0;
      q.max = Number.isFinite(mx) ? mx : 10;
      q.step = 1;
    }

    // 표시조건
    const cond = parseCondition(r.condRaw);
    if (cond) q.condition = cond;

    // 비고: placeholder=… / 단위=… / 기타 설명
    if (r.note) {
      const ph = /placeholder\s*=\s*(.+)/i.exec(r.note);
      if (ph) q.placeholder = ph[1].trim();
      else q.description = r.note;
    }

    if (!bySection.has(r.section)) {
      bySection.set(r.section, []);
      sectionOrder.push(r.section);
    }
    bySection.get(r.section)!.push(q);
  }

  // 각 섹션 내 순서(순서 컬럼) 정렬 — rows 는 이미 순서대로지만 명시 정렬
  const orderOf = new Map<string, number>();
  rows.forEach((r) => orderOf.set(r.qid, r.order));

  const sections: Section[] = sectionOrder.map((title, si) => ({
    id: `s${si + 1}-${slug(title)}`,
    title,
    questions: bySection.get(title)!.sort((a, b) => orderOf.get(a.id)! - orderOf.get(b.id)!),
  }));

  const schema: FormSchema = {
    id: `xlsx_${Date.now().toString(36)}`,
    title: fileName.replace(/\.xlsx$/i, ''),
    version: 1,
    status: 'draft',
    sections,
  };

  return { schema, warnings, questionCount: rows.length };
}
