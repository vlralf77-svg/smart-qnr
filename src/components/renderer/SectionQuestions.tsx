// 섹션 내 문항 렌더링 — 데스크톱은 캔버스 좌표 기반 그리드, 모바일은 세로 스택 폴백
import { Box, Stack, useMediaQuery, useTheme } from '@mui/material';
import { Control, FieldErrors } from 'react-hook-form';
import { Question } from '@/types/schema';
import { withLayouts, sortByReadingOrder, GRID_COLS, GRID_ROW_HEIGHT } from '@/utils/gridLayout';
import QuestionField from './QuestionField';

interface Props {
  questions: Question[];
  control: Control<Record<string, unknown>>;
  errors: FieldErrors<Record<string, unknown>>;
}

export default function SectionQuestions({ questions, control, errors }: Props) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('sm'));

  if (!isDesktop) {
    // 모바일: 좁은 화면에서는 캔버스 좌표를 무시하고 읽기 순서(위→아래, 좌→우)로 세로 스택
    return (
      <Stack spacing={2.5}>
        {sortByReadingOrder(questions).map((q) => (
          <QuestionField key={q.id} question={q} control={control} errors={errors} />
        ))}
      </Stack>
    );
  }

  const placed = withLayouts(questions);
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
        gridAutoRows: `${GRID_ROW_HEIGHT}px`,
        gap: 1.5,
      }}
    >
      {placed.map((q) => (
        <Box
          key={q.id}
          sx={{
            gridColumn: `${q.layout.x + 1} / span ${q.layout.w}`,
            gridRow: `${q.layout.y + 1} / span ${q.layout.h}`,
            minWidth: 0,
            overflow: 'auto',
          }}
        >
          <QuestionField question={q} control={control} errors={errors} />
        </Box>
      ))}
    </Box>
  );
}
