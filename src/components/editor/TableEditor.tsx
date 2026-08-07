// 표(스프레드시트)형 편집기 — 한 행이 한 문항. 유형·질문·필수·선택지를 셀에서 빠르게 입력.
//  섹션 단위로 표시(섹션 선택 + 섹션 추가). 같은 편집 스토어를 사용하므로 다른 모드와 데이터 공유.
import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Popover,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import {
  FormSchema,
  OPTION_TYPES,
  QuestionType,
  QUESTION_TYPE_META,
  QUESTION_TYPE_ORDER,
} from '@/types/schema';
import { createOption } from '@/utils/schemaFactory';
import { useEditorStore } from '@/store/useEditorStore';
import ConditionEditor from './ConditionEditor';

const TYPES = QUESTION_TYPE_ORDER.filter((t) => t !== 'signature');

// 붙여넣은 유형 텍스트 → 문항 유형. 유형 키·한글 라벨·흔한 동의어를 모두 허용.
const TYPE_SYNONYMS: Record<string, QuestionType> = {
  단일: 'radio',
  단일선택: 'radio',
  라디오: 'radio',
  복수: 'checkbox',
  복수선택: 'checkbox',
  체크박스: 'checkbox',
  다중: 'checkbox',
  드롭다운: 'select',
  콤보: 'select',
  셀렉트: 'select',
  단답: 'text',
  단답형: 'text',
  텍스트: 'text',
  장문: 'textarea',
  장문형: 'textarea',
  서술: 'textarea',
  숫자: 'number',
  넘버: 'number',
  날짜: 'date',
  예아니오: 'boolean',
  불린: 'boolean',
  척도: 'scale',
  스케일: 'scale',
  안내: 'info',
  안내문: 'info',
  이미지: 'image',
  그림: 'image',
};

function parseType(raw: string | undefined): QuestionType {
  const s = (raw ?? '').trim().toLowerCase();
  if (!s) return 'radio';
  const byKey = TYPES.find((t) => t.toLowerCase() === s);
  if (byKey) return byKey;
  const byLabel = TYPES.find((t) => QUESTION_TYPE_META[t].label.toLowerCase() === s);
  if (byLabel) return byLabel;
  return TYPE_SYNONYMS[s.replace(/\s+/g, '')] ?? 'radio';
}

interface ParsedRow {
  label: string;
  type: QuestionType;
  optionLabels: string[];
}

// 엑셀/시트 붙여넣기 파싱: 한 줄 = 한 문항. 열은 탭 구분 → 질문[\t유형][\t선택지]
function parseRows(text: string): ParsedRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+$/, ''))
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const cols = line.split('\t');
      const label = (cols[0] ?? '').trim();
      const type = parseType(cols[1]);
      const optionLabels = (cols[2] ?? '')
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean);
      return {
        label,
        type,
        optionLabels: OPTION_TYPES.includes(type) ? optionLabels : [],
      };
    })
    .filter((r) => r.label !== '');
}

interface Props {
  form: FormSchema;
}

export default function TableEditor({ form }: Props) {
  const {
    addQuestion,
    addQuestionsBulk,
    updateQuestion,
    changeQuestionType,
    removeQuestion,
    duplicateQuestion,
    addSection,
  } = useEditorStore();

  const [sectionId, setSectionId] = useState<string>(form.sections[0]?.id ?? '');
  const section = form.sections.find((s) => s.id === sectionId) ?? form.sections[0];
  // 실제 조작 대상 = 화면에 표시 중인 섹션. state(sectionId)가 새 문진 등으로
  // 실제 섹션과 어긋나면(존재하지 않는 id) 폴백된 section 기준으로 조작해야
  // '문항 추가'가 조용히 무시되지 않는다.
  const activeId = section?.id ?? sectionId;

  // 선택지 셀 편집 중 임시 문자열(커서 튐 방지) — 커밋은 blur 시
  const [optDraft, setOptDraft] = useState<Record<string, string>>({});
  // 엑셀 붙여넣기 대화상자
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const parsedPaste = useMemo(() => parseRows(pasteText), [pasteText]);

  const applyPaste = () => {
    if (parsedPaste.length === 0) return;
    addQuestionsBulk(activeId, parsedPaste);
    setPasteText('');
    setPasteOpen(false);
  };
  // 조건부 표시 편집 팝오버
  const [condAnchor, setCondAnchor] = useState<{ el: HTMLElement; qid: string } | null>(null);
  const condQuestion = condAnchor
    ? section?.questions.find((q) => q.id === condAnchor.qid)
    : undefined;

  const optionsText = (qid: string, opts: { label: string }[] | undefined) =>
    optDraft[qid] ?? (opts ?? []).map((o) => o.label).join(', ');

  const commitOptions = (qid: string, raw: string) => {
    const labels = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const old = section?.questions.find((q) => q.id === qid)?.options ?? [];
    const options = labels.map((l, i) =>
      old[i] ? { ...old[i], label: l, value: l } : createOption(l),
    );
    updateQuestion(activeId, qid, { options });
    setOptDraft((d) => {
      const { [qid]: _drop, ...rest } = d;
      return rest;
    });
  };

  const rows = useMemo(() => section?.questions ?? [], [section]);

  if (!section) return null;

  return (
    <Box sx={{ p: 2.5, height: '100%', overflowY: 'auto' }}>
      {/* 상단 도구 */}
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
        sx={{ mb: 1.5 }}
      >
        <TextField
          select
          size="small"
          label="섹션"
          value={section.id}
          onChange={(e) => setSectionId(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          {form.sections.map((s, i) => (
            <MenuItem key={s.id} value={s.id}>
              {s.title || `섹션 ${i + 1}`}
            </MenuItem>
          ))}
        </TextField>
        <Button size="small" variant="text" startIcon={<AddIcon />} onClick={addSection}>
          섹션 추가
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ContentPasteIcon />}
          onClick={() => setPasteOpen(true)}
        >
          엑셀 붙여넣기
        </Button>
        <Box sx={{ flex: 1 }} />
        <Typography variant="body2" color="text.secondary">
          문항 {rows.length}개
        </Typography>
      </Stack>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow>
              <TableCell width={44} sx={{ color: 'text.secondary' }}>
                #
              </TableCell>
              <TableCell width={150}>유형</TableCell>
              <TableCell>질문</TableCell>
              <TableCell width={80} align="center">
                필수
              </TableCell>
              <TableCell width={240}>선택지 (쉼표로 구분)</TableCell>
              <TableCell width={70} align="center">
                조건
              </TableCell>
              <TableCell width={90} align="right">
                작업
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((q, i) => {
              const isOpt = OPTION_TYPES.includes(q.type);
              const isInfoish = q.type === 'info' || q.type === 'image';
              return (
                <TableRow key={q.id} hover>
                  <TableCell sx={{ color: 'text.disabled', fontVariantNumeric: 'tabular-nums' }}>
                    {i + 1}
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      variant="standard"
                      fullWidth
                      value={q.type}
                      onChange={(e) =>
                        changeQuestionType(activeId, q.id, e.target.value as QuestionType)
                      }
                      InputProps={{ disableUnderline: true }}
                    >
                      {TYPES.map((t) => (
                        <MenuItem key={t} value={t}>
                          {QUESTION_TYPE_META[t].label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      variant="standard"
                      fullWidth
                      placeholder="질문을 입력하세요"
                      value={q.label}
                      onChange={(e) => updateQuestion(activeId, q.id, { label: e.target.value })}
                      InputProps={{ disableUnderline: true }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    {isInfoish ? (
                      <Typography variant="caption" color="text.disabled">
                        —
                      </Typography>
                    ) : (
                      <Switch
                        size="small"
                        checked={!!q.required}
                        onChange={(e) =>
                          updateQuestion(activeId, q.id, { required: e.target.checked })
                        }
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {isOpt ? (
                      <TextField
                        size="small"
                        variant="standard"
                        fullWidth
                        placeholder="예: 예, 아니오, 모름"
                        value={optionsText(q.id, q.options)}
                        onChange={(e) => setOptDraft((d) => ({ ...d, [q.id]: e.target.value }))}
                        onBlur={(e) => commitOptions(q.id, e.target.value)}
                        InputProps={{ disableUnderline: true }}
                      />
                    ) : q.type === 'scale' ? (
                      <Typography variant="caption" color="text.secondary">
                        {q.min ?? 0} ~ {q.max ?? 10}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.disabled">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip
                      title={q.condition ? '조건부 표시 설정됨 · 편집' : '조건부 표시(분기) 설정'}
                    >
                      <IconButton
                        size="small"
                        onClick={(e) => setCondAnchor({ el: e.currentTarget, qid: q.id })}
                        sx={{ color: q.condition ? 'primary.main' : 'text.disabled' }}
                      >
                        <CallSplitIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="복제">
                      <IconButton size="small" onClick={() => duplicateQuestion(activeId, q.id)}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="삭제">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removeQuestion(activeId, q.id)}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography
                    variant="body2"
                    color="text.disabled"
                    sx={{ py: 2, textAlign: 'center' }}
                  >
                    아래 ‘문항 추가’로 첫 문항을 만드세요.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Button
        startIcon={<AddIcon />}
        onClick={() => addQuestion(activeId, 'radio')}
        sx={{ mt: 1.5 }}
        variant="outlined"
      >
        문항 추가
      </Button>

      {/* 조건부 표시 편집 팝오버 */}
      <Popover
        open={!!condAnchor && !!condQuestion}
        anchorEl={condAnchor?.el ?? null}
        onClose={() => setCondAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { p: 2, width: 340, maxWidth: '90vw' } }}
      >
        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
          조건부 표시 (분기)
        </Typography>
        {condQuestion && <ConditionEditor sectionId={activeId} question={condQuestion} />}
      </Popover>

      {/* 엑셀 붙여넣기(여러 줄 한 번에) */}
      <Dialog open={pasteOpen} onClose={() => setPasteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>엑셀 붙여넣기</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 1.5 }}>
            엑셀·시트에서 복사한 여러 줄을 붙여넣으세요. 한 줄이 한 문항이 됩니다.
            <br />
            열은 <b>탭</b>으로 구분: <b>질문 [탭] 유형 [탭] 선택지(쉼표)</b> — 유형·선택지는 생략
            가능(기본 단일 선택).
          </Alert>
          <TextField
            multiline
            fullWidth
            minRows={7}
            maxRows={16}
            autoFocus
            placeholder={
              '흡연하십니까?\t단일\t예, 아니오\n음주 빈도\t드롭다운\t안함, 주1회, 매일\n복용 중인 약'
            }
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            InputProps={{ sx: { fontFamily: 'monospace', fontSize: 13 } }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            인식된 문항: <b>{parsedPaste.length}</b>개
            {parsedPaste.length > 0 &&
              ` · ${parsedPaste
                .slice(0, 3)
                .map((r) => `${r.label}(${QUESTION_TYPE_META[r.type].label})`)
                .join(', ')}${parsedPaste.length > 3 ? ' …' : ''}`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasteOpen(false)}>취소</Button>
          <Button variant="contained" onClick={applyPaste} disabled={parsedPaste.length === 0}>
            {parsedPaste.length > 0 ? `${parsedPaste.length}개 추가` : '추가'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
