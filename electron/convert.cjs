// 문서 → 문진 변환 (Electron 메인 프로세스, Node)
//  1) 파일 텍스트 추출: PDF(pdf-parse) / DOCX(mammoth)
//  2) Claude API 로 문진 스키마(JSON) 생성 (작업지시서 §6)
// HWP/HWPX 는 후속 단계에서 파서 추가.

const path = require('node:path');

// ── 1. 텍스트 추출 ─────────────────────────────────────────────
async function extractText(buffer, fileName) {
  const ext = path.extname(fileName || '').toLowerCase();

  if (ext === '.pdf') {
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    let layoutHints = '';
    try {
      // 표 구조 힌트(선택지 매핑 정확도 향상). 실패해도 무시.
      const table = await parser.getTable();
      if (table && Array.isArray(table.pages)) {
        const tables = table.pages.flatMap((p) => p.tables || []);
        if (tables.length) {
          layoutHints = `표 ${tables.length}개 감지됨. 표의 행/열은 선택지 후보로 검토.`;
        }
      }
    } catch {
      /* 표 추출 실패는 무시 */
    }
    return { rawText: (result.text || '').trim(), layoutHints };
  }

  if (ext === '.docx') {
    const mammoth = require('mammoth');
    const { value } = await mammoth.extractRawText({ buffer });
    return { rawText: (value || '').trim(), layoutHints: 'DOCX 원문(서식 제외) 추출.' };
  }

  if (ext === '.doc') {
    throw new Error('구(舊) .doc 형식은 지원하지 않습니다. .docx 또는 PDF 로 저장 후 업로드하세요.');
  }
  if (ext === '.hwp' || ext === '.hwpx') {
    throw new Error('HWP/HWPX 자동 변환은 후속 단계에서 지원 예정입니다. PDF 로 저장 후 업로드하세요.');
  }

  // 그 외: 평문 텍스트로 시도
  return { rawText: buffer.toString('utf8').trim(), layoutHints: '' };
}

// ── 2. LLM 변환 프롬프트 (작업지시서 §6.1) ─────────────────────
const SYSTEM_PROMPT = `당신은 병원 문진 양식을 디지털 문진 스키마로 변환하는 전문가입니다.
입력으로 문서에서 추출한 원문 텍스트와 레이아웃 힌트를 받습니다.
이를 분석하여 아래 규칙에 따라 문진 스키마 JSON만 출력하세요.

[규칙]
1. 하나의 질문 = 하나의 question 객체로 만든다.
2. 문항 유형(type)을 문맥으로 추론한다:
   - "예/아니오", 상호배타 선택지 → radio (또는 boolean)
   - "해당사항 모두" 등 복수선택 문구 → checkbox
   - 자유 서술 요청 → textarea, 짧은 값 → text
   - 날짜/생년월일 → date, 수치(키/몸무게/나이) → number
   - 통증 점수 등 0~10 척도 → scale
   - 선택지 없는 안내 문장 → info
3. 선택지가 있으면 options 배열로 구성하고 value는 라벨의 약어/코드로 지정한다.
4. "기타( )", "직접 입력" 항목이 보이면 allowEtc:true 로 처리한다.
5. 섹션 구분(대제목/구획)이 보이면 sections로 나눈다.
6. 확실치 않으면 type을 text로 두고 required는 false로 한다.
7. 반드시 유효한 JSON만 출력한다. 코드펜스, 설명, 주석 없이 순수 JSON.

[출력 스키마]
{ "id", "title", "description", "version":1, "status":"draft", "sections":[{ "id", "title", "questions":[{ "id", "type", "label", "required", "options"?, "allowEtc"?, "placeholder" }] }] }

[문항 유형 화이트리스트]
radio, checkbox, select, text, textarea, number, date, boolean, scale, info`;

async function convertToSchema({ rawText, layoutHints, apiKey }) {
  if (!rawText || rawText.length < 5) {
    throw new Error('추출된 텍스트가 너무 짧습니다. 문서를 확인하거나 빈 문진에서 직접 작성하세요.');
  }
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error('Claude API 키가 설정되지 않았습니다. 설정에서 API 키를 입력하세요.');
  }

  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: key });

  const userContent =
    '다음은 문진 양식 원문입니다.\n\n' +
    '=== 원문 ===\n' +
    rawText +
    '\n\n=== 레이아웃 힌트 ===\n' +
    (layoutHints || '(없음)') +
    '\n\n위 내용을 문진 스키마 JSON으로 변환하세요.';

  const resp = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });

  const text = (resp.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

  if (!text) throw new Error('LLM 응답이 비어 있습니다. 다시 시도하세요.');
  return text; // 원본 JSON 문자열(코드펜스 포함 가능) → 렌더러에서 정규화/검증
}

module.exports = { extractText, convertToSchema };
