// @dnd-kit 정렬 가능한 행 래퍼
import { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box } from '@mui/material';

interface Props {
  id: string;
  children: (dragHandleProps: Record<string, unknown>) => ReactNode;
}

export default function SortableRow({ id, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <Box ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners })}
    </Box>
  );
}
