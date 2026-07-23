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
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import FormatColorResetIcon from '@mui/icons-material/FormatColorReset';
import Tooltip from '@mui/material/Tooltip';
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
      <Typography variant="subtitle2" fontWeight={700} mb={0.25}>
        선택지
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" mb={1}>
        색 버튼으로 강조 색을 지정하면, 작성한 내용을 <b>조회</b>할 때 그 답이 색으로 강조됩니다.
        (작성/입력 화면에는 표시되지 않음 — 꼭 확인해야 하는 답변 강조용)
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
                      sx={{ width: 110 }}
                    />
                    {/* 선택 시 강조 색 — 색을 지정하면 스와치, 없으면 색칠 아이콘 */}
                    <Tooltip title={o.color ? `강조 색 ${o.color} (클릭해 변경)` : '선택 시 강조 색 지정'}>
                      <Box sx={{ position: 'relative', width: 34, height: 34, flexShrink: 0 }}>
                        <Box
                          component="input"
                          type="color"
                          value={o.color ?? '#d32f2f'}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updateOption(sectionId, question.id, o.id, { color: e.target.value })
                          }
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            opacity: 0,
                            cursor: 'pointer',
                          }}
                        />
                        <Box
                          sx={{
                            pointerEvents: 'none',
                            width: 34,
                            height: 34,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: o.color ? o.color : 'divider',
                            bgcolor: o.color ?? 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {!o.color && (
                            <FormatColorFillIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                          )}
                        </Box>
                      </Box>
                    </Tooltip>
                    {o.color && (
                      <Tooltip title="강조 색 지우기">
                        <IconButton
                          size="small"
                          onClick={() =>
                            updateOption(sectionId, question.id, o.id, { color: undefined })
                          }
                        >
                          <FormatColorResetIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
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
