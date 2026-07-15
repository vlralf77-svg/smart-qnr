// 선택형 문항의 선택지 편집 (추가/수정/삭제/순서변경)
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
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import { Question } from '@/types/schema';
import { useEditorStore } from '@/store/useEditorStore';
import SortableRow from './SortableRow';

interface Props {
  sectionId: string;
  question: Question;
}

export default function OptionsEditor({ sectionId, question }: Props) {
  const { addOption, updateOption, removeOption, reorderOptions, updateQuestion } = useEditorStore();
  const options = question.options ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = options.findIndex((o) => o.id === active.id);
    const to = options.findIndex((o) => o.id === over.id);
    if (from >= 0 && to >= 0) reorderOptions(sectionId, question.id, from, to);
  };

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} mb={1}>
        선택지
      </Typography>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={options.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          <Stack spacing={1}>
            {options.map((o) => (
              <SortableRow key={o.id} id={o.id}>
                {(handle) => (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Box
                      {...handle}
                      sx={{ cursor: 'grab', display: 'flex', color: 'text.disabled' }}
                    >
                      <DragIndicatorIcon fontSize="small" />
                    </Box>
                    <TextField
                      size="small"
                      value={o.label}
                      placeholder="표시 라벨"
                      onChange={(e) =>
                        updateOption(sectionId, question.id, o.id, {
                          label: e.target.value,
                          // value 가 label 과 동일하게 관리되던 경우 함께 갱신
                          value: o.value === o.label ? e.target.value : o.value,
                        })
                      }
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      size="small"
                      value={o.value}
                      placeholder="저장값(코드)"
                      onChange={(e) =>
                        updateOption(sectionId, question.id, o.id, { value: e.target.value })
                      }
                      sx={{ width: 130 }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => removeOption(sectionId, question.id, o.id)}
                      disabled={options.length <= 1}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                )}
              </SortableRow>
            ))}
          </Stack>
        </SortableContext>
      </DndContext>

      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={() => addOption(sectionId, question.id)}
        sx={{ mt: 1 }}
      >
        선택지 추가
      </Button>

      <FormControlLabel
        sx={{ display: 'block', mt: 0.5 }}
        control={
          <Checkbox
            size="small"
            checked={!!question.allowEtc}
            onChange={(e) =>
              updateQuestion(sectionId, question.id, { allowEtc: e.target.checked })
            }
          />
        }
        label={<Typography variant="body2">'기타(직접입력)' 옵션 자동 추가</Typography>}
      />
    </Box>
  );
}
