// 환자 작성 내용 → 이미지(PNG) 생성·다운로드.
//  외부 라이브러리 없이 Canvas 로 렌더(한글 안전). 브라우저는 다운로드 폴더로 저장,
//  Electron 도 기본 다운로드 위치로 저장된다. (원래는 병원 서버 전송용 — 서버 확정 후 교체)
import { AnswerValue, FormSchema, Question, NON_INPUT_TYPES } from '@/types/schema';
import { orderedQuestions } from './questionOrder';
import { computeScore, isScoringEnabled, scoringLabel } from './scoring';
import { collectFindings } from './findings';

export interface ResponseMeta {
  patientName?: string;
  patientNo?: string;
  submittedAt?: string;
}

const FONT = '"Pretendard","Noto Sans KR","Malgun Gothic","Apple SD Gothic Neo",sans-serif';

function fmtAnswer(q: Question, v: AnswerValue): string {
  if (v === null || v === undefined || v === '') return '(미응답)';
  if (q.type === 'boolean') return v === true || v === 'true' ? '예' : '아니오';
  if (q.type === 'radio' || q.type === 'select') {
    return q.options?.find((o) => o.value === v)?.label ?? String(v);
  }
  if (q.type === 'checkbox') {
    const arr = Array.isArray(v) ? v : [v];
    return arr.map((x) => q.options?.find((o) => o.value === x)?.label ?? String(x)).join(', ');
  }
  return String(v);
}

function fmtDate(ts?: string): string {
  if (!ts) return '';
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? ts : d.toLocaleString('ko-KR');
}

// 선택한 답변(선택지)에 지정된 강조 색이 있으면 반환 — 조회 화면과 동일하게 표시
function answerColor(q: Question, v: AnswerValue): string | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  if (q.type === 'radio' || q.type === 'select') {
    return q.options?.find((o) => o.value === v)?.color;
  }
  if (q.type === 'checkbox') {
    const arr = Array.isArray(v) ? v : [v];
    return q.options?.find((o) => arr.includes(o.value) && o.color)?.color;
  }
  return undefined;
}

interface Cmd {
  x: number;
  y: number;
  text: string;
  font: string;
  color: string;
}

/** 작성 내용을 흰 배경 이미지(PNG data URL)로 렌더 */
export function buildResponseImageDataUrl(
  form: FormSchema,
  answers: Record<string, AnswerValue>,
  meta: ResponseMeta = {},
): string {
  const W = 820;
  const PAD = 40;
  const maxW = W - PAD * 2;
  const meas = document.createElement('canvas').getContext('2d');
  if (!meas) return '';
  const cmds: Cmd[] = [];
  let y = PAD;

  const wrap = (text: string, font: string): string[] => {
    meas.font = font;
    const out: string[] = [];
    for (const raw of String(text).split('\n')) {
      let line = '';
      for (const ch of raw) {
        const t = line + ch;
        if (meas.measureText(t).width > maxW && line) {
          out.push(line);
          line = ch;
        } else line = t;
      }
      out.push(line);
    }
    return out.length ? out : [''];
  };

  const block = (
    text: string,
    size: number,
    color: string,
    opts?: { bold?: boolean; indent?: number; gap?: number },
  ) => {
    const font = `${opts?.bold ? 'bold ' : ''}${size}px ${FONT}`;
    const indent = opts?.indent ?? 0;
    const lh = size * 1.5;
    for (const line of wrap(text, font)) {
      cmds.push({ x: PAD + indent, y: y + size, text: line, font, color });
      y += lh;
    }
    y += opts?.gap ?? 0;
  };

  const rule = () => {
    y += 4;
    cmds.push({ x: -1, y, text: '__RULE__', font: '', color: '#e3e9e1' });
    y += 14;
  };

  // 헤더
  block(form.title || '문진', 24, '#12213a', { bold: true, gap: 4 });
  const metaLine = [
    meta.patientName,
    meta.patientNo,
    meta.submittedAt ? `제출: ${fmtDate(meta.submittedAt)}` : '',
  ]
    .filter(Boolean)
    .join('    ');
  if (metaLine) block(metaLine, 13, '#64738d', { gap: 6 });

  // 총점(채점 문진)
  if (isScoringEnabled(form)) {
    const s = computeScore(form, answers);
    let line = `${scoringLabel(form)}: ${s.total} / ${s.max}점`;
    if (s.band) line += `  · ${s.band.label}`;
    block(line, 16, '#124a86', { bold: true, gap: 2 });
  }
  rule();

  // 주요 소견(요약) — 색상 강조된 소견을 상단에 먼저 배치
  const findings = collectFindings(form, answers);
  block('■ 주요 소견', 14, '#9b2c2c', { bold: true, gap: 2 });
  if (findings.length) {
    for (const f of findings) block(`· ${f.label}`, 15, f.color, { bold: true, indent: 10 });
  } else {
    block('· 문진상 특이 소견 없음', 14, '#64738d', { indent: 10 });
  }
  y += 8;
  rule();

  // 문항별 답변
  for (const section of form.sections) {
    const qs = orderedQuestions(section).filter((q) => !NON_INPUT_TYPES.includes(q.type));
    if (qs.length === 0) continue;
    if (section.title) block(section.title, 14, '#41600f', { bold: true, gap: 2 });
    for (const q of qs) {
      // 편집기에서 지정한 글자 색·크기를 라벨에 반영(조회 화면과 동일)
      const labelColor = q.color || '#14203a';
      const labelSize = q.fontSize && q.fontSize > 0 ? q.fontSize : 15;
      block(`Q. ${q.label || ''}`, labelSize, labelColor, { bold: true });
      const val = answers[q.id] ?? null;
      // 답변을 (라벨, 강조색) 세그먼트로 분해 — 다중 선택은 선택지마다 개별 색 반영
      const segs: { text: string; color?: string }[] = [];
      if (val === null || val === undefined || val === '') {
        segs.push({ text: '(미응답)' });
      } else if (q.type === 'checkbox') {
        const arr = Array.isArray(val) ? val : [val];
        arr.forEach((x) => {
          const o = q.options?.find((oo) => oo.value === x);
          segs.push({ text: o?.label ?? String(x), color: o?.color });
        });
      } else {
        segs.push({ text: fmtAnswer(q, val), color: answerColor(q, val) });
      }
      const note = answers[`${q.id}__text`];
      if (note != null && String(note).trim() !== '')
        segs.push({ text: `직접입력: ${String(note)}` });
      segs.forEach((s, i) => {
        block(`${i === 0 ? '→ ' : '· '}${s.text}`, 14, s.color || '#33415e', {
          indent: i === 0 ? 14 : 26,
          gap: i === segs.length - 1 ? 10 : 0,
        });
      });
    }
    y += 6;
  }

  // 렌더
  const dpr = 2;
  const H = Math.ceil(y + PAD);
  const canvas = document.createElement('canvas');
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.scale(dpr, dpr);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  for (const c of cmds) {
    if (c.text === '__RULE__') {
      ctx.strokeStyle = c.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, c.y);
      ctx.lineTo(W - PAD, c.y);
      ctx.stroke();
      continue;
    }
    ctx.font = c.font;
    ctx.fillStyle = c.color;
    ctx.fillText(c.text, c.x, c.y);
  }
  return canvas.toDataURL('image/png');
}

/** data URL 을 파일로 다운로드(브라우저 다운로드 폴더로 저장) */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** 파일명에 쓸 수 없는 문자 제거 */
export function sanitizeFilename(s: string): string {
  return (s || 'file')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}
