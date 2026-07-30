// 표(스프레드시트)형 편집기 — 한 행이 한 문항. 유형·질문·필수·선택지를 셀에서 빠르게 입력.
//  섹션 단위로 표시(섹션 선택 + 섹션 추가). 같은 편집 스토어를 사용하므로 다른 모드와 데이터 공유.
import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Paper,
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
import {
  FormSchema,
  OPTION_TYPES,
  QuestionType,
  QUESTION_TYPE_META,
  QUESTION_TYPE_ORDER,
} from '@/types/schema';
import { createOption } from '@/utils/schemaFactory';
import { useEditorStore } from '@/store/useEditorStore';

const TYPES = QUESTION_TYPE_ORDER.filter((t) => t !== 'signature');

interface Props {
  form: FormSchema;
}

export default function TableEditor({ form }: Props) {
  const { addQuestion, updateQuestion, changeQuestionType, removeQuestion, duplicateQuestion, addSection } =
    useEditorStore();

  const [sectionId, setSectionId] = useState<string>(form.sections[0]?.id ?? '');
  const section = form.sections.find((s) => s.id === sectionId) ?? form.sections[0];

  // 선택지 셀 편집 중 임시 문자열(커서 튐 방지) — 커밋은 blur 시
  const [optDraft, setOptDraft] = useState<Record<string, string>>({});

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
    updateQuestion(sectionId, qid, { options });
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
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
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
                      onChange={(e) => changeQuestionType(sectionId, q.id, e.target.value as QuestionType)}
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
                      onChange={(e) => updateQuestion(sectionId, q.id, { label: e.target.value })}
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
                        onChange={(e) => updateQuestion(sectionId, q.id, { required: e.target.checked })}
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
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="복제">
                      <IconButton size="small" onClick={() => duplicateQuestion(sectionId, q.id)}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="삭제">
                      <IconButton size="small" color="error" onClick={() => removeQuestion(sectionId, q.id)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography variant="body2" color="text.disabled" sx={{ py: 2, textAlign: 'center' }}>
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
        onClick={() => addQuestion(sectionId, 'radio')}
        sx={{ mt: 1.5 }}
        variant="outlined"
      >
        문항 추가
      </Button>
    </Box>
  );
}
