// 집중(포커스) 편집기 — 왼쪽 문항 목록, 오른쪽 선택한 한 문항만 크게 편집.
//  편집 패널은 기존 QuestionEditPanel 재사용. 같은 편집 스토어를 사용.
import {
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { FormSchema, QUESTION_TYPE_META } from '@/types/schema';
import { useEditorStore } from '@/store/useEditorStore';
import QuestionEditPanel from './QuestionEditPanel';

interface Props {
  form: FormSchema;
}

export default function FocusEditor({ form }: Props) {
  const selected = useEditorStore((s) => s.selected);
  const select = useEditorStore((s) => s.select);
  const addQuestion = useEditorStore((s) => s.addQuestion);
  const activeSectionId = useEditorStore((s) => s.activeSectionId);

  // 전체 문항을 번호와 함께 평탄화
  const flat = form.sections.flatMap((s) =>
    s.questions.map((q) => ({ sectionId: s.id, sectionTitle: s.title, question: q })),
  );
  const selEntry = selected
    ? flat.find((e) => e.question.id === selected.questionId)
    : undefined;

  const addTarget =
    activeSectionId ||
    selEntry?.sectionId ||
    form.sections[form.sections.length - 1]?.id ||
    '';

  return (
    <Box sx={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
      {/* 좌: 문항 목록 */}
      <Box
        sx={{
          width: 260,
          flexShrink: 0,
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.default',
          overflowY: 'auto',
          p: 1.25,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            px: 0.75,
            mb: 0.75,
            fontWeight: 800,
            letterSpacing: '0.04em',
            color: 'text.disabled',
          }}
        >
          문항 {flat.length}개
        </Typography>
        <Stack spacing={0.5}>
          {flat.map((e, i) => {
            const on = selected?.questionId === e.question.id;
            return (
              <Box
                key={e.question.id}
                onClick={() => select({ sectionId: e.sectionId, questionId: e.question.id })}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1,
                  py: 0.85,
                  borderRadius: 2,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: on ? 'primary.main' : 'transparent',
                  bgcolor: on ? 'background.paper' : 'transparent',
                  boxShadow: on ? '0 4px 12px -6px rgba(15,23,42,.25)' : 'none',
                  '&:hover': { bgcolor: on ? 'background.paper' : 'action.hover' },
                }}
              >
                <Box
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: 1.5,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 800,
                    bgcolor: on ? 'primary.main' : 'action.hover',
                    color: on ? 'primary.contrastText' : 'text.secondary',
                  }}
                >
                  {i + 1}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    noWrap
                    color={e.question.label ? 'text.primary' : 'text.disabled'}
                  >
                    {e.question.label || '(제목 없음)'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {QUESTION_TYPE_META[e.question.type]?.label}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Stack>
        <Button
          fullWidth
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => addTarget && addQuestion(addTarget, 'radio')}
          sx={{ mt: 1 }}
        >
          문항 추가
        </Button>
      </Box>

      {/* 우: 선택 문항 편집 */}
      <Box sx={{ flex: 1, minWidth: 0, overflowY: 'auto', p: 3 }}>
        {selEntry ? (
          <Box sx={{ maxWidth: 720, mx: 'auto' }}>
            <Chip
              size="small"
              label={`${flat.findIndex((f) => f.question.id === selEntry.question.id) + 1}번 문항`}
              sx={{ mb: 1.5 }}
            />
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <QuestionEditPanel sectionId={selEntry.sectionId} question={selEntry.question} />
            </Paper>
          </Box>
        ) : (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.disabled',
              textAlign: 'center',
            }}
          >
            <Typography variant="body1">왼쪽에서 문항을 선택하거나</Typography>
            <Typography variant="body1">‘문항 추가’로 시작하세요.</Typography>
            <Divider sx={{ my: 2, width: 120 }} />
            <Typography variant="caption">한 번에 한 문항씩 집중해서 편집합니다.</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
