// 에디터 좌측 아웃라인 — 섹션 정렬 + 섹션 추가
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
import { Button, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { FormSchema } from '@/types/schema';
import { useEditorStore } from '@/store/useEditorStore';
import SortableRow from './SortableRow';
import SectionBlock from './SectionBlock';

interface Props {
  form: FormSchema;
}

export default function EditorOutline({ form }: Props) {
  const { addSection, reorderSections } = useEditorStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = form.sections.findIndex((s) => s.id === active.id);
    const to = form.sections.findIndex((s) => s.id === over.id);
    if (from >= 0 && to >= 0) reorderSections(from, to);
  };

  return (
    <Stack spacing={1.5}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={form.sections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <Stack spacing={1.5}>
            {form.sections.map((s) => (
              <SortableRow key={s.id} id={s.id}>
                {(handle) => (
                  <SectionBlock
                    section={s}
                    sectionDragHandle={handle}
                    canDeleteSection={form.sections.length > 1}
                  />
                )}
              </SortableRow>
            ))}
          </Stack>
        </SortableContext>
      </DndContext>

      <Button startIcon={<AddIcon />} onClick={addSection} variant="text">
        섹션 추가
      </Button>
    </Stack>
  );
}
