// 문진 응답 통계 집계 — 문진/문항/기간을 받아 문항 유형별로 결과를 계산.
import { FormResponse, FormSchema, Question } from '@/types/schema';
import { computeScore } from './scoring';

export interface DistItem {
  key: string;
  label: string;
  count: number;
  pct: number; // 0~100 (응답한 건수 대비)
  color?: string;
}

export interface HistBin {
  label: string;
  count: number;
  pct: number;
}

export type StatResult =
  | { kind: 'distribution'; total: number; answered: number; items: DistItem[]; multi: boolean }
  | {
      kind: 'numeric';
      total: number;
      answered: number;
      avg: number;
      median: number;
      min: number;
      max: number;
      histogram: HistBin[];
    }
  | { kind: 'text'; total: number; answered: number; items: DistItem[]; distinct: number }
  | { kind: 'empty'; total: number };

const SKIP_TYPES = ['info', 'image', 'signature'];

// 통계 대상이 되는(값을 수집하는) 문항만
export function inputQuestions(form: FormSchema): Question[] {
  return form.sections.flatMap((s) => s.questions).filter((q) => !SKIP_TYPES.includes(q.type));
}

// 제출일이 [from, to] (YYYY-MM-DD, 포함) 범위 안인지
export function withinRange(iso: string, from?: string, to?: string): boolean {
  const d = (iso || '').slice(0, 10);
  if (!d) return false;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

function hasValue(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'string') return v.trim() !== '';
  return true;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

export type FilterOp = 'eq' | 'gte' | 'lte' | 'includes';
export interface ResponseFilter {
  questionId: string;
  op: FilterOp;
  value: string;
}

// 한 조건이 응답에 부합하는지
function answerMatches(question: Question, ans: unknown, op: FilterOp, value: string): boolean {
  if (ans === undefined || ans === null) return false;
  if (question.type === 'checkbox') {
    const arr = Array.isArray(ans) ? ans.map(String) : [String(ans)];
    return arr.includes(value);
  }
  if (question.type === 'number' || question.type === 'scale') {
    const n = Number(ans);
    const v = Number(value);
    if (!Number.isFinite(n) || !Number.isFinite(v)) return false;
    if (op === 'gte') return n >= v;
    if (op === 'lte') return n <= v;
    return n === v;
  }
  if (question.type === 'boolean') {
    const truthy = ans === true || ans === 'true' || ans === '예' || ans === 1 || ans === '1';
    return value === 'true' || value === '예' ? truthy : !truthy;
  }
  return String(ans) === value;
}

// 응답이 모든 AND 조건을 만족하는지 (값이 비어있는 조건은 무시)
export function responseMatchesFilters(
  form: FormSchema,
  response: FormResponse,
  filters: ResponseFilter[],
): boolean {
  const qById = new Map(form.sections.flatMap((s) => s.questions).map((q) => [q.id, q]));
  return filters.every((f) => {
    if (!f.questionId || f.value === '') return true;
    const q = qById.get(f.questionId);
    if (!q) return true;
    return answerMatches(q, response.answers?.[f.questionId], f.op, f.value);
  });
}

// 문항 하나에 대해 응답들을 집계 (responses 는 이미 문진·기간으로 필터된 목록)
export function aggregateQuestion(question: Question, responses: FormResponse[]): StatResult {
  const total = responses.length;
  const present = responses.filter((r) => hasValue(r.answers?.[question.id]));
  const answered = present.length;
  if (answered === 0) return { kind: 'empty', total };

  const optLabel = (val: string) =>
    question.options?.find((o) => o.value === val || o.label === val)?.label ?? val;
  const optColor = (val: string) =>
    question.options?.find((o) => o.value === val || o.label === val)?.color;

  // 단일 선택형
  if (question.type === 'radio' || question.type === 'select') {
    const counts = new Map<string, number>();
    present.forEach((r) => {
      const v = String(r.answers[question.id]);
      counts.set(v, (counts.get(v) ?? 0) + 1);
    });
    const items = [...counts.entries()]
      .map(([key, count]) => ({
        key,
        label: optLabel(key),
        count,
        pct: (count / answered) * 100,
        color: optColor(key),
      }))
      .sort((a, b) => b.count - a.count);
    return { kind: 'distribution', total, answered, items, multi: false };
  }

  // 복수 선택형 — 선택지별로 각각 카운트(합계가 응답 수를 넘을 수 있음)
  if (question.type === 'checkbox') {
    const counts = new Map<string, number>();
    present.forEach((r) => {
      const raw = r.answers[question.id];
      const arr = Array.isArray(raw) ? raw : [raw];
      arr.forEach((v) => {
        const k = String(v);
        counts.set(k, (counts.get(k) ?? 0) + 1);
      });
    });
    const items = [...counts.entries()]
      .map(([key, count]) => ({
        key,
        label: optLabel(key),
        count,
        pct: (count / answered) * 100,
        color: optColor(key),
      }))
      .sort((a, b) => b.count - a.count);
    return { kind: 'distribution', total, answered, items, multi: true };
  }

  // 예/아니오
  if (question.type === 'boolean') {
    let yes = 0;
    present.forEach((r) => {
      const v = r.answers[question.id];
      const truthy = v === true || v === 'true' || v === '예' || v === 1 || v === '1';
      if (truthy) yes++;
    });
    const no = answered - yes;
    const items: DistItem[] = [
      { key: 'yes', label: '예', count: yes, pct: (yes / answered) * 100 },
      { key: 'no', label: '아니오', count: no, pct: (no / answered) * 100 },
    ];
    return { kind: 'distribution', total, answered, items, multi: false };
  }

  // 숫자 / 척도 — 요약통계 + 히스토그램
  if (question.type === 'number' || question.type === 'scale') {
    const nums = present
      .map((r) => Number(r.answers[question.id]))
      .filter((n) => Number.isFinite(n));
    if (nums.length === 0) return { kind: 'empty', total };
    const sorted = [...nums].sort((a, b) => a - b);
    const sum = nums.reduce((a, b) => a + b, 0);
    const avg = sum / nums.length;
    const median =
      sorted.length % 2
        ? sorted[(sorted.length - 1) / 2]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    const qmin = question.min ?? min;
    const qmax = question.max ?? max;
    const range = qmax - qmin;
    const histogram: HistBin[] = [];
    if (Number.isInteger(qmin) && Number.isInteger(qmax) && range >= 1 && range <= 12) {
      // 정수 척도(예: NRS 0~10)는 값별로
      for (let v = qmin; v <= qmax; v++) {
        const count = nums.filter((n) => Math.round(n) === v).length;
        histogram.push({ label: String(v), count, pct: (count / nums.length) * 100 });
      }
    } else {
      const bins = 8;
      const width = (max - min) / bins || 1;
      for (let i = 0; i < bins; i++) {
        const lo = min + width * i;
        const hi = i === bins - 1 ? max : min + width * (i + 1);
        const count = nums.filter((n) =>
          i === bins - 1 ? n >= lo && n <= hi : n >= lo && n < hi,
        ).length;
        histogram.push({
          label: `${round(lo)}~${round(hi)}`,
          count,
          pct: (count / nums.length) * 100,
        });
      }
    }
    return {
      kind: 'numeric',
      total,
      answered: nums.length,
      avg: round(avg),
      median: round(median),
      min,
      max,
      histogram,
    };
  }

  // 단답/장문/날짜 — 동일 응답 상위 집계
  const counts = new Map<string, number>();
  present.forEach((r) => {
    const k = String(r.answers[question.id]).trim();
    counts.set(k, (counts.get(k) ?? 0) + 1);
  });
  const all = [...counts.entries()]
    .map(([key, count]) => ({ key, label: key, count, pct: (count / answered) * 100 }))
    .sort((a, b) => b.count - a.count);
  return { kind: 'text', total, answered, items: all.slice(0, 12), distinct: all.length };
}

// ── 총점 분포(채점 문진) ────────────────────────────────────────
export interface ScoreStats {
  count: number; // 응답 수
  avg: number; // 평균 총점
  min: number; // 최소 총점
  max: number; // 최대 총점
  formMax: number; // 이 문진의 만점
  bins: DistItem[]; // 총점 히스토그램(최대 12구간)
  bands: DistItem[]; // 해석 구간(밴드)별 분포(밴드 없으면 빈 배열)
}

/** 기간(호출부에서 필터)으로 추린 응답들의 총점 분포를 계산한다. */
export function computeScoreStats(form: FormSchema, responses: FormResponse[]): ScoreStats {
  const totals = responses.map((r) => computeScore(form, r.answers).total);
  const count = totals.length;
  const formMax = computeScore(form, {}).max;
  const observedMax = count ? Math.max(...totals) : 0;
  const upper = Math.max(formMax, observedMax, 1);
  const sum = totals.reduce((a, b) => a + b, 0);
  const avg = count ? sum / count : 0;
  const min = count ? Math.min(...totals) : 0;
  const max = observedMax;

  // 히스토그램(최대 12구간)
  const nBins = Math.min(12, upper + 1);
  const binSize = Math.max(1, Math.ceil((upper + 1) / nBins));
  const buckets: { lo: number; hi: number; count: number }[] = [];
  for (let lo = 0; lo <= upper; lo += binSize) {
    buckets.push({ lo, hi: Math.min(upper, lo + binSize - 1), count: 0 });
  }
  for (const t of totals) {
    const idx = Math.min(buckets.length - 1, Math.max(0, Math.floor(t / binSize)));
    buckets[idx].count += 1;
  }
  const bins: DistItem[] = buckets.map((b, i) => ({
    key: `bin-${i}`,
    label: b.lo === b.hi ? `${b.lo}점` : `${b.lo}–${b.hi}점`,
    count: b.count,
    pct: count ? (b.count / count) * 100 : 0,
  }));

  // 해석 구간(밴드)별 분포
  const bandDefs = form.scoring?.bands ?? [];
  const bands: DistItem[] = bandDefs.map((bd, i) => {
    const c = totals.filter((t) => t >= bd.min && t <= bd.max).length;
    return {
      key: `band-${i}`,
      label: bd.label || `${bd.min}–${bd.max}`,
      count: c,
      pct: count ? (c / count) * 100 : 0,
      color: bd.color,
    };
  });

  return { count, avg, min, max, formMax, bins, bands };
}
