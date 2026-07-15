// 섹션 하나를 자유 배치 캔버스로 렌더링 — 문항을 드래그로 이동, 모서리로 크기 조절
//
// 참고: react-draggable/react-grid-layout 로 감싼 아이템은 네이티브 onClick 이
// 안정적으로 발생하지 않는다(라이브러리의 mousedown/mouseup 가로채기 특성).
// 그래서 "클릭으로 선택"은 onDragStop/onResizeStop 에서 위치·크기가 실제로
// 바뀌지 않은 경우(=이동 없는 클릭)를 클릭으로 간주해 처리한다.
import RGL, { WidthProvider, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Box } from '@mui/material';
import { Question } from '@/types/schema';
import { useEditorStore } from '@/store/useEditorStore';
import { GRID_COLS, GRID_ROW_HEIGHT, GRID_MARGIN, withLayouts } from '@/utils/gridLayout';
import QuestionCard from './QuestionCard';

const GridLayout = WidthProvider(RGL);

interface Props {
  sectionId: string;
  questions: Question[];
}

export default function LayoutCanvas({ sectionId, questions }: Props) {
  const { selected, select, updateQuestionLayout, duplicateQuestion, removeQuestion } = useEditorStore();

  if (questions.length === 0) {
    return null;
  }

  const placed = withLayouts(questions);
  const layout: Layout[] = placed.map((q) => ({
    i: q.id,
    x: q.layout.x,
    y: q.layout.y,
    w: q.layout.w,
    h: q.layout.h,
    minW: 2,
    minH: 2,
  }));

  const handleDragStop = (_l: Layout[], oldItem: Layout, newItem: Layout) => {
    if (oldItem.x === newItem.x && oldItem.y === newItem.y) {
      select({ sectionId, questionId: newItem.i });
      return;
    }
    updateQuestionLayout(sectionId, newItem.i, {
      x: newItem.x,
      y: newItem.y,
      w: newItem.w,
      h: newItem.h,
    });
  };

  const handleResizeStop = (_l: Layout[], oldItem: Layout, newItem: Layout) => {
    if (oldItem.w === newItem.w && oldItem.h === newItem.h) {
      select({ sectionId, questionId: newItem.i });
      return;
    }
    updateQuestionLayout(sectionId, newItem.i, {
      x: newItem.x,
      y: newItem.y,
      w: newItem.w,
      h: newItem.h,
    });
  };

  return (
    <Box sx={{ '& .react-grid-item.react-grid-placeholder': { bgcolor: 'primary.light', opacity: 0.3, borderRadius: 1.5 } }}>
      <GridLayout
        layout={layout}
        cols={GRID_COLS}
        rowHeight={GRID_ROW_HEIGHT}
        margin={GRID_MARGIN}
        compactType={null}
        isResizable
        isDraggable
        draggableCancel=".rgl-no-drag"
        onDragStop={handleDragStop}
        onResizeStop={handleResizeStop}
      >
        {placed.map((q) => (
          <div key={q.id}>
            <QuestionCard
              question={q}
              selected={selected?.questionId === q.id}
              onDuplicate={() => duplicateQuestion(sectionId, q.id)}
              onDelete={() => removeQuestion(sectionId, q.id)}
            />
          </div>
        ))}
      </GridLayout>
    </Box>
  );
}
