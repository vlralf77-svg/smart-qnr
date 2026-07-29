// 아웃라인의 섹션 1개 (제목 편집 + 자유 배치 캔버스 + 문항 추가/섹션 삭제)
import { Box, IconButton, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Section, QuestionType } from '@/types/schema';
import { useEditorStore } from '@/store/useEditorStore';
import LayoutCanvas from './LayoutCanvas';
import AddQuestionMenu from './AddQuestionMenu';

interface Props {
  section: Section;
  sectionDragHandle: Record<string, unknown>;
  canDeleteSection: boolean;
}

export default function SectionBlock({ section, sectionDragHandle, canDeleteSection }: Props) {
  const { addQuestion, updateSection, removeSection, setActiveSection } = useEditorStore();
  const activeSectionId = useEditorStore((s) => s.activeSectionId);
  const isActive = activeSectionId === section.id;

  return (
    <Paper
      variant="outlined"
      onMouseDown={() => setActiveSection(section.id)}
      sx={{
        p: 1.5,
        // 활성 섹션(단축키 추가 대상)을 테두리로 강조
        borderColor: isActive ? 'primary.main' : 'divider',
        boxShadow: isActive ? (t) => `0 0 0 1px ${t.palette.primary.main}` : 'none',
        transition: 'border-color .12s, box-shadow .12s',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.5} mb={1}>
        <Box {...sectionDragHandle} sx={{ cursor: 'grab', display: 'flex', color: 'text.disabled' }}>
          <DragIndicatorIcon fontSize="small" />
        </Box>
        <TextField
          variant="standard"
          value={section.title}
          onChange={(e) => updateSection(section.id, { title: e.target.value })}
          InputProps={{ disableUnderline: true, sx: { fontWeight: 700, fontSize: 15 } }}
          sx={{ flex: 1 }}
          placeholder="섹션 제목"
        />
        <Tooltip title={canDeleteSection ? '섹션 삭제' : '최소 1개 섹션 필요'}>
          <span>
            <IconButton
              size="small"
              disabled={!canDeleteSection}
              onClick={() => removeSection(section.id)}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {section.questions.length === 0 ? (
        <Typography variant="caption" color="text.disabled" sx={{ pl: 4, display: 'block', py: 1 }}>
          문항이 없습니다. 아래에서 추가하세요.
        </Typography>
      ) : (
        <LayoutCanvas sectionId={section.id} questions={section.questions} />
      )}

      <Box sx={{ pl: 4, mt: 1 }}>
        <AddQuestionMenu onAdd={(t: QuestionType) => addQuestion(section.id, t)} />
      </Box>
    </Paper>
  );
}
