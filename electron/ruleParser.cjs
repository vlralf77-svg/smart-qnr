// 문서 원문 텍스트 → 문진 스키마 규칙 기반 변환기 (오픈소스/로컬, 외부 API 미사용)
// LLM 없이 정규식·휴리스틱으로 섹션/문항/선택지/유형을 추론한다.
// 정확도는 LLM 대비 낮을 수 있으므로 에디터에서 반드시 검수한다 (§4.2).

let seq = 0;
function uid(prefix) {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}${seq.toString(36)}`;
}

// ── 선택지 라인 판별 (섹션 판별보다 먼저 검사되어야 함: 마커 중복 방지) ──
const OPTION_MARKER_RE = /^[□○◯●▢\-\*·•]\s*|^[①②③④⑤⑥⑦⑧⑨⑩]\s*|^\(\s*\)\s*|^\[\s*\]\s*/;
const SLASH_LIST_RE = /^[가-힣A-Za-z0-9]+(\s*\/\s*[가-힣A-Za-z0-9]+)+$/;
const COMMA_LIST_RE = /^[가-힣A-Za-z0-9()·\s]+(,\s*[가-힣A-Za-z0-9()·\s]+){1,}$/;

function isOptionLine(line) {
  if (OPTION_MARKER_RE.test(line)) return true;
  if (SLASH_LIST_RE.test(line)) return true;
  // 콤마 나열: 물음표 없고 문장형이 아니며(동사 종결 어미 없음) 5어절 이하
  if (COMMA_LIST_RE.test(line) && !/[다까요]\s*[.?]?$/.test(line) && line.split(',').length <= 8) {
    return true;
  }
  return false;
}

function splitOptionLine(line) {
  const stripped = line.replace(OPTION_MARKER_RE, '').trim();
  if (SLASH_LIST_RE.test(line))
    return line
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean);
  if (COMMA_LIST_RE.test(line))
    return line
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  return [stripped].filter(Boolean);
}

// ── 섹션 헤더 판별 ──────────────────────────────────────────────
// 선택지 마커(□○●①…)와 겹치지 않는 마커만 사용: 로마숫자/장·부·편/◆▶►※ 등.
const SECTION_NUM_RE = /^[\[【<［]?\s*(제\s*\d+\s*(장|부|편)|[IVXLC]+[.)]|[◆▶►※])\s*/;
const SECTION_KEYWORDS = [
  '기본정보',
  '개인정보',
  '인적사항',
  '병력',
  '과거병력',
  '현재증상',
  '복용약물',
  '약물정보',
  '알레르기',
  '수술이력',
  '가족력',
  '생활습관',
  '검사항목',
  '통증평가',
  '동의사항',
  '서명',
  '보호자정보',
  '연락처',
  '보험정보',
  '진료정보',
];

function isSectionHeader(line) {
  if (line.length > 20) return false;
  if (/[?？(（]/.test(line)) return false; // 물음표·괄호 있는 줄은 질문일 확률이 높음
  if (isOptionLine(line)) return false; // 선택지 마커와 우선순위 충돌 방지
  if (SECTION_NUM_RE.test(line)) return true;

  const compact = line.replace(/\s+/g, '');
  for (const kw of SECTION_KEYWORDS) {
    // 키워드로 시작하고, 부가 수식어(예: "및 복용약물")를 포함해도 전체 길이가 짧을 때만 섹션으로 인정
    if (compact.startsWith(kw) && compact.length <= kw.length + 6) return true;
  }
  return false;
}

function stripSectionMarker(line) {
  return (
    line
      .replace(SECTION_NUM_RE, '')
      .replace(/[:：]\s*$/, '')
      .trim() || line
  );
}

// ── 문항 라벨 정리 ──────────────────────────────────────────────
const LABEL_NUM_RE = /^(Q\s*\d+[.)]|문\s*\d+[.)]|제?\s*\d+\s*항[.)]?|\d+[.)])\s*/i;

function cleanLabel(label) {
  let l = label.replace(LABEL_NUM_RE, '').trim();
  const required = /[*＊]\s*$/.test(l) || /\(필수\)/.test(l);
  l = l
    .replace(/[*＊]\s*$/, '')
    .replace(/\(필수\)/, '')
    .trim();
  return { label: l, required };
}

function createOption(label) {
  return { id: uid('o'), label, value: label };
}

// ── 문항 유형 추론 ──────────────────────────────────────────────
function inferQuestionType(label, optionLabels) {
  if (optionLabels.length > 0) {
    const joined = optionLabels.join('|');
    if (
      optionLabels.length === 2 &&
      /예|아니오|아니요|Y|N/.test(joined) &&
      optionLabels.every((o) => /^(예|아니오|아니요|Y|N)$/.test(o))
    ) {
      return 'boolean';
    }
    if (/모두\s*선택|해당.{0,4}모두|복수\s*선택|체크(해|하세요)/.test(label)) {
      return 'checkbox';
    }
    return 'radio';
  }
  if (/생년월일|날짜|일자/.test(label)) return 'date';
  if (/나이|연령|체중|몸무게|키\b|신장|kg|cm|세\)?$/.test(label)) return 'number';
  if (/통증.{0,6}(점수|척도)|NRS|VAS|0\s*~\s*10/.test(label)) return 'scale';
  if (/구체적으로|자세히|설명해|작성해\s*주세요|서술/.test(label) || label.length > 40) {
    return 'textarea';
  }
  if (!/[?？]/.test(label) && /[.다요]$/.test(label) && label.length > 15) {
    return 'info'; // 안내 문장(질문형이 아닌 서술문)
  }
  return 'text';
}

function buildQuestion(rawLabel, optionLines) {
  const { label, required } = cleanLabel(rawLabel);

  let optionLabels = [];
  for (const line of optionLines) {
    optionLabels.push(...splitOptionLine(line));
  }
  let allowEtc = false;
  optionLabels = optionLabels.filter((o) => {
    if (/^기타/.test(o)) {
      allowEtc = true;
      return false;
    }
    return true;
  });

  const type = inferQuestionType(label, optionLabels);
  const q = { id: uid('q'), type, label, required: !!required };

  if (type === 'radio' || type === 'checkbox' || type === 'select') {
    q.options =
      optionLabels.length > 0 ? optionLabels.map(createOption) : [createOption('선택지 1')];
    if (allowEtc) q.allowEtc = true;
  }
  if (type === 'scale') {
    q.min = 0;
    q.max = 10;
    q.step = 1;
  }
  if (type === 'number') {
    q.min = 0;
  }
  return q;
}

/**
 * 원문 텍스트를 문진 스키마로 변환 (동기, 외부 네트워크 호출 없음).
 * @param {{ rawText: string, layoutHints?: string, title?: string }} input
 * @returns {object} FormSchema (draft)
 */
function parseDocumentText({ rawText, title }) {
  if (!rawText || rawText.trim().length < 5) {
    throw new Error(
      '추출된 텍스트가 너무 짧습니다. 문서를 확인하거나 빈 문진에서 직접 작성하세요.',
    );
  }

  let lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // 첫 줄이 짧고 물음표가 없으면 문서 제목으로 간주해 본문에서 제외
  let detectedTitle = title;
  if (!detectedTitle && lines.length > 1 && lines[0].length <= 40 && !/[?？]/.test(lines[0])) {
    detectedTitle = lines[0];
    lines = lines.slice(1);
  }

  const sections = [];
  let currentSection = null;
  let currentLabel = null;
  let currentOptionLines = [];

  const flushQuestion = () => {
    if (currentLabel && currentSection) {
      currentSection.questions.push(buildQuestion(currentLabel, currentOptionLines));
    }
    currentLabel = null;
    currentOptionLines = [];
  };

  const startSection = (headerLine) => {
    flushQuestion();
    currentSection = { id: uid('sec'), title: stripSectionMarker(headerLine), questions: [] };
    sections.push(currentSection);
  };

  for (const line of lines) {
    if (isSectionHeader(line)) {
      startSection(line);
      continue;
    }
    if (isOptionLine(line)) {
      if (currentLabel) currentOptionLines.push(line);
      continue; // 문항 없이 등장하는 선택지 라인은 무시
    }
    // 새 문항 라벨
    flushQuestion();
    if (!currentSection) startSection('문항');
    currentLabel = line;
  }
  flushQuestion();

  if (sections.length === 0 || sections.every((s) => s.questions.length === 0)) {
    // 아무 것도 추출 못한 경우: 원문 전체를 info 문항으로 담아 폴백
    sections.length = 0;
    sections.push({
      id: uid('sec'),
      title: '원문',
      questions: [
        {
          id: uid('q'),
          type: 'info',
          label:
            '자동 변환에서 문항을 인식하지 못했습니다. 아래 원문을 참고해 문항을 직접 구성하세요.\n\n' +
            rawText.slice(0, 4000),
        },
      ],
    });
  }

  const now = new Date().toISOString();
  return {
    id: `FORM_${now.slice(0, 10).replace(/-/g, '')}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    title: detectedTitle || '변환된 문진(검수 필요)',
    description:
      '문서에서 자동 변환된 초안입니다(로컬 규칙 기반 변환). 문항 유형·선택지를 반드시 확인·수정하세요.',
    version: 1,
    status: 'draft',
    sections,
    createdAt: now,
    updatedAt: now,
  };
}

module.exports = { parseDocumentText };
