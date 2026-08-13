// 문진 응답 해석 공통 유틸 — 조회 화면(요약 기록지)과 이미지(PNG) 저장이 같은 규칙을 쓰도록 분리.
import { AnswerValue, FormSchema, Question, NON_INPUT_TYPES } from '@/types/schema';
import { orderedQuestions } from './questionOrder';

/** 응답 값 조각(표시 라벨 + 선택지에 지정된 강조색) */
export interface AnsPart {
  label: string;
  color?: string;
}

/** 응답 값을 (라벨, 강조색) 조각으로 분해 — 다중 선택은 선택지마다 개별 색 적용 */
export function answerParts(q: Question, v: AnswerValue): AnsPart[] {
  if (v === null || v === undefined || v === '') return [{ label: '(미응답)' }];
  if (q.type === 'boolean') return [{ label: v === true || v === 'true' ? '예' : '아니오' }];
  if (q.type === 'radio' || q.type === 'select') {
    const opt = q.options?.find((o) => o.value === v);
    return [{ label: opt?.label ?? String(v), color: opt?.color }];
  }
  if (q.type === 'checkbox') {
    const arr = Array.isArray(v) ? v : [v];
    return arr.map((x) => {
      const o = q.options?.find((oo) => oo.value === x);
      return { label: o?.label ?? String(x), color: o?.color };
    });
  }
  // 단답형·서술형·숫자 등 직접 입력 문항 — 문항에 지정한 답변 강조색 적용
  return [{ label: String(v), color: q.answerColor }];
}

/**
 * 질문형 문항 라벨을 명사구로 정리 — '현재 복용 중인 약이 있습니까?' → '현재 복용 중인 약'.
 * 기록지 서술 문장이 자연스럽게 읽히도록 의문·요청 어미를 제거한다.
 */
export function cleanLabel(raw: string): string {
  let s = (raw || '').trim().replace(/[?？!.。]+\s*$/g, '');
  // '…이 있다면/있으시면/있을 경우 ~' 꼬리 제거 (예: '통증이 있다면 정도를 선택해 주세요' → '통증')
  s = s.replace(/\s*(이|가)?\s*있(다면|으시다면|으시면|을\s*경우|는\s*경우)[\s\S]*$/, '');
  // '…이/가 있습니까' → 명사만
  s = s.replace(/\s*(이|가)\s*있(습니까|나요|으신가요|는지요)\s*$/, '');
  // '…을/를 선택/입력/기입/작성/체크(해 주세요…)' 요청문 제거
  s = s.replace(
    /\s*(을|를)?\s*(선택|입력|기입|작성|체크|표시)\s*(해\s*주세요|해주세요|해\s*주십시오|하세요|하십시오|바랍니다)?\s*$/,
    '',
  );
  // '…을/를 하십니까' → 명사만 (예: '흡연을 하십니까' → '흡연')
  s = s.replace(/\s*(을|를)\s*(하십니까|하시나요|합니까|하나요)\s*$/, '');
  // 남은 의문/청유 어미 제거
  s = s.replace(
    /\s*(하십니까|하시나요|합니까|하나요|입니까|인가요|습니까|됩니까|되십니까)\s*$/,
    '',
  );
  s = s.replace(/\s*(해\s*주세요|해주세요|하세요|하십시오|바랍니다|주세요)\s*$/, '');
  // 꼬리에 조사만 남으면 제거
  s = s.replace(/\s*(을|를|은|는|이|가|의)\s*$/, '').trim();
  return s || (raw || '').trim();
}

/** 답변 자체로는 의미가 없는(예/아니오 등) 단답 여부 */
const BARE_ANSWER = /^(예|아니오|있음|없음|해당|해당됨|유|무)$/;

/** 'A, B 및 C' 형태로 명사 나열 */
export function joinKo(arr: string[]): string {
  if (arr.length <= 1) return arr[0] ?? '';
  return `${arr.slice(0, -1).join(', ')} 및 ${arr[arr.length - 1]}`;
}

/**
 * 주요 소견 서술문 조각 — 색상 강조 용어는 color 를 유지해 문장 안에 색으로 표시할 수 있게 한다.
 * 예) 상기 환자는 문진상 [당뇨], [고혈압] 소견이 확인되는 환자로, 진료 시 …
 */
export function findingsSentence(
  findings: { label: string; color: string }[],
): { text: string; color?: string }[] {
  if (!findings.length) return [{ text: '문진상 특이 소견은 확인되지 않음.' }];
  const segs: { text: string; color?: string }[] = [{ text: '상기 환자는 문진상 ' }];
  findings.forEach((f, i) => {
    if (i > 0) segs.push({ text: i === findings.length - 1 ? ' 및 ' : ', ' });
    segs.push({ text: f.label, color: f.color });
  });
  segs.push({ text: ' 소견이 확인되는 환자로, 진료 시 상기 소견에 대한 확인 및 참고를 요함.' });
  return segs;
}

/**
 * 주요 소견 — 색상 강조된 답변을 소견 용어 목록으로 정리.
 * 답이 예/아니오처럼 그 자체로 의미가 없으면 문항명을 소견 용어로 사용한다.
 */
export function collectFindings(
  form: FormSchema,
  answers: Record<string, AnswerValue>,
): { label: string; color: string }[] {
  const out: { label: string; color: string }[] = [];
  form.sections.forEach((s) => {
    orderedQuestions(s)
      .filter((q) => !NON_INPUT_TYPES.includes(q.type))
      .forEach((q) => {
        const qLabel = cleanLabel(q.label);
        answerParts(q, answers[q.id] ?? null)
          .filter((p) => p.color)
          .forEach((p) => {
            const label = BARE_ANSWER.test(p.label.trim()) ? qLabel : p.label;
            if (!out.some((f) => f.label === label)) out.push({ label, color: p.color as string });
          });
      });
  });
  return out;
}
