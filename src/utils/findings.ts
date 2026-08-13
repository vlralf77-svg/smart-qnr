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

/**
 * 설문조사 문진 여부 — 분류(카테고리)에 '설문'이 포함되면 설문으로 본다.
 * 설문조사는 진료 소견 개념이 없으므로 요약(주요 소견)을 제공하지 않는다.
 */
export function isSurveyForm(form?: Pick<FormSchema, 'category'>): boolean {
  return !!form?.category && form.category.includes('설문');
}

/** 'A, B 및 C' 형태로 명사 나열 */
export function joinKo(arr: string[]): string {
  if (arr.length <= 1) return arr[0] ?? '';
  return `${arr.slice(0, -1).join(', ')} 및 ${arr[arr.length - 1]}`;
}

/** 강조된 소견 1건 — 문항명(qLabel)과 답변 용어(term)를 함께 보관해 서술 문장을 만든다. */
export interface Finding {
  /** 소견 용어(강조 표시 대상) — 단답(예/있음)이면 문항명이 들어간다 */
  label: string;
  color: string;
  /** 문항명(명사구로 정리된 것) */
  qLabel: string;
  /** 답변이 예/있음처럼 그 자체로 의미가 없는지 */
  bare: boolean;
}

/** 목적격 조사 을/를 */
const eulReul = (w: string) => (hasJong(w) ? '을' : '를');
/** 주격 조사 이/가 */
const iGa = (w: string) => (hasJong(w) ? '이' : '가');
/** 주제 조사 은/는 */
const eunNeun = (w: string) => (hasJong(w) ? '은' : '는');

/** 받침 유무 판별 */
function hasJong(word: string): boolean {
  const ch = (word || '').trim().slice(-1);
  const code = ch.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
}

type Run = { text: string; color?: string };
/** 소견 1건의 서술 절 — runs(강조 포함) + 중간/마지막 어미 */
interface Clause {
  runs: Run[];
  mid: string;
  last: string;
}

/** 문항 주제 분류 — 같은 주제의 중복 서술(있음 + 구체 답)을 정리하는 데 사용 */
function findingTopic(qLabel: string): string | null {
  if (/복용/.test(qLabel)) return '복용';
  if (/흡연|담배/.test(qLabel)) return '흡연';
  if (/음주|술/.test(qLabel)) return '음주';
  if (/알레르기|알러지/.test(qLabel)) return '알레르기';
  if (/진단|질환|병력/.test(qLabel)) return '진단';
  if (/수술|시술/.test(qLabel)) return '수술';
  if (/임신|수유/.test(qLabel)) return '임신';
  return null;
}

/**
 * 소견 1건을 자연스러운 서술 절로 변환.
 * 흔한 문진 문항(복용 약물·흡연·알레르기·진단·수술·음주 등)은 의학 기록 문체의
 * 서술어로 바꾸고, 그 외에는 '문항명은 답변' 형태로 일반화한다.
 */
function findingClause(f: Finding): Clause {
  const { label, color, qLabel, bare } = f;
  const hl = (t: string): Run => ({ text: t, color });
  const now = /현재/.test(qLabel) ? '현재 ' : '';

  // 복용 중인 약 — 약 이름만 적힌 경우 '~약을 복용 중'으로 다듬는다('혈압' → '혈압약을 복용 중')
  if (/복용/.test(qLabel)) {
    if (bare)
      return { runs: [{ text: now }, hl('약물')], mid: '을 복용 중이며, ', last: '을 복용 중임.' };
    const suffix = /(약|제|정|캡슐|주사)$/.test(label) ? '' : '약';
    const tail = suffix || label;
    return {
      runs: [{ text: now }, hl(label)],
      mid: `${suffix}${eulReul(tail)} 복용 중이며, `,
      last: `${suffix}${eulReul(tail)} 복용 중임.`,
    };
  }
  // 흡연
  if (/흡연|담배/.test(qLabel)) {
    const extra = bare ? '' : `(${label})`;
    return { runs: [{ text: now }, hl('흡연'), { text: extra }], mid: ' 중이며, ', last: ' 중임.' };
  }
  // 음주
  if (/음주|술/.test(qLabel)) {
    if (bare)
      return { runs: [{ text: now }, hl('음주')], mid: '력이 있으며, ', last: '력이 있음.' };
    return { runs: [{ text: now }, hl('음주'), { text: ` ${label}` }], mid: '이며, ', last: '임.' };
  }
  // 알레르기
  if (/알레르기|알러지/.test(qLabel)) {
    const term = bare ? qLabel : `${label} 알레르기`;
    return { runs: [hl(term)], mid: `${iGa(term)} 있으며, `, last: `${iGa(term)} 있음.` };
  }
  // 진단·질환
  if (/진단|질환|병력/.test(qLabel)) {
    if (bare)
      return { runs: [hl(qLabel)], mid: `${iGa(qLabel)} 있으며, `, last: `${iGa(qLabel)} 있음.` };
    return {
      runs: [hl(label)],
      mid: `${eulReul(label)} 진단받았으며, `,
      last: `${eulReul(label)} 진단받았음.`,
    };
  }
  // 수술·시술 이력
  if (/수술|시술/.test(qLabel)) {
    const term = bare ? '수술 이력' : `${label} 수술 이력`;
    return { runs: [hl(term)], mid: '이 있으며, ', last: '이 있음.' };
  }
  // 임신·수유
  if (/임신|수유/.test(qLabel)) {
    const term = bare ? qLabel : label;
    return { runs: [{ text: now }, hl(term)], mid: ' 중이며, ', last: ' 중임.' };
  }
  // 기본 — 단답이면 '…이 확인되며', 값이 있으면 '문항명은 값이며'
  if (bare)
    return { runs: [hl(label)], mid: `${iGa(label)} 확인되며, `, last: `${iGa(label)} 확인됨.` };
  return {
    runs: [{ text: `${qLabel}${eunNeun(qLabel)} ` }, hl(label)],
    mid: '이며, ',
    last: '임.',
  };
}

/**
 * 주요 소견 서술문 조각 — 색상 강조 용어는 color 를 유지해 문장 안에 색으로 표시할 수 있게 한다.
 * 예) 상기 환자는 문진상 [혈압약]을 복용 중이며, [현재 흡연] 중임. 진료 시 …
 */
export function findingsSentence(findings: Finding[]): Run[] {
  // 같은 주제에 구체적인 답(약 이름 등)이 있으면 '있음'만 표시된 항목은 생략해
  //  '약물을 복용 중이며, 혈압약을 복용 중이며' 식의 중복을 없앤다.
  const specific = new Set(findings.filter((f) => !f.bare).map((f) => findingTopic(f.qLabel)));
  const list = findings.filter((f) => !(f.bare && specific.has(findingTopic(f.qLabel))));
  if (!list.length) return [{ text: '문진상 특이 소견은 확인되지 않음.' }];
  const segs: Run[] = [{ text: '상기 환자는 문진상 ' }];
  list.forEach((f, i) => {
    const c = findingClause(f);
    segs.push(...c.runs);
    segs.push({ text: i === list.length - 1 ? c.last : c.mid });
  });
  segs.push({ text: ' 진료 시 상기 소견에 대한 확인 및 참고를 요함.' });
  return segs;
}

/**
 * 주요 소견 — 색상 강조된 답변을 소견 목록으로 정리.
 * 답이 예/아니오처럼 그 자체로 의미가 없으면 문항명을 소견 용어로 사용한다.
 */
export function collectFindings(form: FormSchema, answers: Record<string, AnswerValue>): Finding[] {
  const out: Finding[] = [];
  form.sections.forEach((s) => {
    orderedQuestions(s)
      .filter((q) => !NON_INPUT_TYPES.includes(q.type))
      .forEach((q) => {
        const qLabel = cleanLabel(q.label);
        answerParts(q, answers[q.id] ?? null)
          .filter((p) => p.color)
          .forEach((p) => {
            const bare = BARE_ANSWER.test(p.label.trim());
            const label = bare ? qLabel : p.label;
            if (!out.some((f) => f.label === label && f.qLabel === qLabel))
              out.push({ label, color: p.color as string, qLabel, bare });
          });
      });
  });
  return out;
}
