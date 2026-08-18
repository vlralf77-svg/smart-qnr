// 환자 작성 내용 → 이미지(PNG) 생성·다운로드.
//  외부 라이브러리 없이 Canvas 로 렌더(한글 안전). 브라우저는 다운로드 폴더로 저장,
//  Electron 도 기본 다운로드 위치로 저장된다. (원래는 병원 서버 전송용 — 서버 확정 후 교체)
import { AnswerValue, FormSchema, NON_INPUT_TYPES } from '@/types/schema';
import { orderedQuestions } from './questionOrder';
import { computeScore, isScoringEnabled, scoringLabel } from './scoring';
import { answerParts, collectFindings, findingsSentence, isSurveyForm } from './findings';

export interface ResponseMeta {
  patientName?: string;
  patientNo?: string;
  submittedAt?: string;
}

const FONT = '"Pretendard","Noto Sans KR","Malgun Gothic","Apple SD Gothic Neo",sans-serif';

function fmtDate(ts?: string): string {
  if (!ts) return '';
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? ts : d.toLocaleString('ko-KR');
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

  /**
   * 서술 문단 — 색이 다른 조각(runs)을 한 문장처럼 이어서 줄바꿈 배치.
   *  강조 용어는 자기 색·굵기를 유지하면서 문장 흐름은 끊기지 않는다.
   */
  const paragraph = (
    runs: { text: string; color?: string }[],
    size: number,
    baseColor: string,
    opts?: { indent?: number; gap?: number },
  ) => {
    const indent = opts?.indent ?? 0;
    const lh = size * 1.6;
    const avail = maxW - indent;
    let x = PAD + indent;
    for (const run of runs) {
      const bold = !!run.color; // 강조 용어만 굵게
      const font = `${bold ? 'bold ' : ''}${size}px ${FONT}`;
      const color = run.color || baseColor;
      meas.font = font;
      // 공백 단위로 잘라 넘치면 줄바꿈(한글은 글자 단위로도 보정)
      for (const token of run.text.split(/(\s+)/)) {
        if (!token) continue;
        let t = token;
        while (t) {
          let fit = t;
          while (fit && x - PAD - indent + meas.measureText(fit).width > avail) {
            fit = fit.slice(0, -1);
          }
          if (!fit) {
            // 현재 줄에 한 글자도 못 넣으면 줄바꿈
            y += lh;
            x = PAD + indent;
            continue;
          }
          if (/^\s+$/.test(fit) && x === PAD + indent) {
            t = t.slice(fit.length);
            continue; // 줄 앞 공백 제거
          }
          cmds.push({ x, y: y + size, text: fit, font, color });
          x += meas.measureText(fit).width;
          t = t.slice(fit.length);
          if (t) {
            y += lh;
            x = PAD + indent;
          }
        }
      }
    }
    y += lh + (opts?.gap ?? 0);
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

  // 주요 소견(요약) — 요약본과 동일한 서술 문장으로 상단에 배치.
  //  설문조사는 진료 소견 개념이 없으므로 생략한다.
  if (!isSurveyForm(form)) {
    block('■ 주요 소견', 13.5, '#9b2c2c', { bold: true, gap: 2 });
    paragraph(findingsSentence(collectFindings(form, answers)), 14.5, '#1f2937', {
      indent: 10,
      gap: 6,
    });
    rule();
  }

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
      // 답변을 (라벨, 강조색) 조각으로 분해 — 조회 화면과 같은 공용 규칙(answerParts)을 사용해
      //  선택지 강조색은 물론 단답형 문항의 답변 강조색(answerColor)도 그대로 반영한다.
      const segs: { text: string; color?: string }[] = answerParts(q, val).map((p) => ({
        text: p.label,
        color: p.color,
      }));
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
