// 문서 → 문진 변환 (Electron 메인 프로세스, Node)
//  1) 파일 텍스트 추출: PDF(pdf-parse) / DOCX(mammoth)
//  2) 로컬 규칙 기반 변환(ruleParser.cjs) — 외부 API 미사용, 오프라인 동작
// HWP/HWPX 는 후속 단계에서 파서 추가.

const path = require('node:path');
const { parseDocumentText } = require('./ruleParser.cjs');

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

// ── 2. 로컬 규칙 기반 변환 (외부 API 미사용) ────────────────────
async function convertToSchema({ rawText, layoutHints, title }) {
  const schema = parseDocumentText({ rawText, layoutHints, title });
  return JSON.stringify(schema); // 렌더러의 기존 파싱 경로(parseLlmSchemaText)와 호환
}

module.exports = { extractText, convertToSchema };
