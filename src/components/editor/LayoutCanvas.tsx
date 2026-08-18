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
import {
  GRID_COLS,
  GRID_ROW_HEIGHT,
  GRID_MARGIN,
  DEFAULT_QUESTION_W,
  defaultHeightForType,
  withLayouts,
} from '@/utils/gridLayout';
import QuestionCard from './QuestionCard';
import { usePaletteDrag } from './paletteDrag';

const GridLayout = WidthProvider(RGL);

interface Props {
  sectionId: string;
  questions: Question[];
}

export default function LayoutCanvas({ sectionId, questions }: Props) {
  const {
    selected,
    select,
    updateQuestionLayoutsBulk,
    duplicateQuestion,
    removeQuestion,
    addQuestion,
  } = useEditorStore();
  // 팔레트에서 끌고 오는 중이면 놓을 자리를 미리 보여주고, 빈 섹션에도 드롭 영역을 남긴다
  const { type: dragType, setType } = usePaletteDrag();

  if (questions.length === 0 && !dragType) {
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
    minH: 1,
  }));

  // 드래그로 이동하면 겹침 방지를 위해 이웃 문항도 밀려난다. 드래그된 항목만이 아니라
  // 변경된 모든 항목(nextLayout 전체)을 저장해야 미리보기 순서가 실제로 반영된다.
  const commitLayouts = (nextLayout: Layout[]) => {
    const cur = new Map(placed.map((q) => [q.id, q.layout]));
    const updates = nextLayout
      .filter((it) => {
        const c = cur.get(it.i);
        return !c || c.x !== it.x || c.y !== it.y || c.w !== it.w || c.h !== it.h;
      })
      .map((it) => ({ id: it.i, layout: { x: it.x, y: it.y, w: it.w, h: it.h } }));
    if (updates.length) updateQuestionLayoutsBulk(updates);
  };

  const handleDragStop = (nextLayout: Layout[], oldItem: Layout, newItem: Layout) => {
    if (oldItem.x === newItem.x && oldItem.y === newItem.y) {
      select({ sectionId, questionId: newItem.i });
      return;
    }
    commitLayouts(nextLayout);
  };

  const handleResizeStop = (nextLayout: Layout[], oldItem: Layout, newItem: Layout) => {
    if (oldItem.w === newItem.w && oldItem.h === newItem.h) {
      select({ sectionId, questionId: newItem.i });
      return;
    }
    commitLayouts(nextLayout);
  };

  // 팔레트에서 끌어다 놓은 지점에 문항을 추가한다(놓인 행 y 기준으로 아래를 밀어냄)
  const handleDrop = (_next: Layout[], item: Layout) => {
    if (!dragType) return;
    addQuestion(sectionId, dragType, { x: item.x, y: item.y });
    setType(null);
  };

  return (
    <Box
      sx={{
        '& .react-grid-item.react-grid-placeholder': {
          bgcolor: 'primary.light',
          opacity: 0.3,
          borderRadius: 1.5,
        },
        // 끌어오는 중에는 놓을 수 있는 영역임을 보이게 한다(빈 섹션 포함)
        ...(dragType && {
          minHeight: GRID_ROW_HEIGHT,
          border: '2px dashed',
          borderColor: 'primary.main',
          borderRadius: 2,
          bgcolor: 'action.hover',
        }),
      }}
    >
      <GridLayout
        layout={layout}
        cols={GRID_COLS}
        rowHeight={GRID_ROW_HEIGHT}
        margin={GRID_MARGIN}
        // 세로 압축 — 문항을 위로 붙여 빈 줄을 남기지 않는다.
        //  압축이 없으면 위→아래로 옮길 때 아래 문항들이 밀려나기만 하고 비워진 윗줄이
        //  그대로 남아, 화면 위쪽에 빈칸이 쌓이고 캔버스만 계속 길어진다.
        compactType="vertical"
        isResizable
        isDraggable
        draggableCancel=".rgl-no-drag"
        onDragStop={handleDragStop}
        onResizeStop={handleResizeStop}
        isDroppable={!!dragType}
        droppingItem={{
          i: '__palette__',
          w: DEFAULT_QUESTION_W,
          h: dragType ? defaultHeightForType(dragType) : 1,
        }}
        onDrop={handleDrop}
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
