// 아웃라인의 섹션 1개 (제목 편집 + 문항 정렬 리스트 + 문항 추가/섹션 삭제)
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Box, IconButton, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Section, QuestionType } from '@/types/schema';
import { useEditorStore } from '@/store/useEditorStore';
import SortableRow from './SortableRow';
import QuestionRow from './QuestionRow';
import AddQuestionMenu from './AddQuestionMenu';

interface Props {
  section: Section;
  sectionDragHandle: Record<string, unknown>;
  canDeleteSection: boolean;
}

export default function SectionBlock({ section, sectionDragHandle, canDeleteSection }: Props) {
  const {
    selected,
    select,
    addQuestion,
    removeQuestion,
    duplicateQuestion,
    reorderQuestions,
    updateSection,
    removeSection,
  } = useEditorStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = section.questions.findIndex((q) => q.id === active.id);
    const to = section.questions.findIndex((q) => q.id === over.id);
    if (from >= 0 && to >= 0) reorderQuestions(section.id, from, to);
  };

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext
            items={section.questions.map((q) => q.id)}
            strategy={verticalListSortingStrategy}
          >
            <Stack spacing={0.25}>
              {section.questions.map((q, idx) => (
                <SortableRow key={q.id} id={q.id}>
                  {(handle) => (
                    <QuestionRow
                      question={q}
                      index={idx}
                      selected={selected?.questionId === q.id}
                      dragHandleProps={handle}
                      onSelect={() => select({ sectionId: section.id, questionId: q.id })}
                      onDuplicate={() => duplicateQuestion(section.id, q.id)}
                      onDelete={() => removeQuestion(section.id, q.id)}
                    />
                  )}
                </SortableRow>
              ))}
            </Stack>
          </SortableContext>
        </DndContext>
      )}

      <Box sx={{ pl: 4, mt: 1 }}>
        <AddQuestionMenu onAdd={(t: QuestionType) => addQuestion(section.id, t)} />
      </Box>
    </Paper>
  );
}
