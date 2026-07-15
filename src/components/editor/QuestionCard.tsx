// 캔버스 위의 문항 카드 (react-grid-layout 자식) — 드래그로 이동, 모서리로 크기 조절
import { Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import { Question, QUESTION_TYPE_META } from '@/types/schema';

interface Props {
  question: Question;
  selected: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
}

export default function QuestionCard({ question, selected, onDuplicate, onDelete }: Props) {
  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        borderWidth: selected ? 2 : 1,
        borderRadius: 1.5,
        bgcolor: 'background.paper',
        cursor: 'pointer',
        overflow: 'hidden',
        boxShadow: selected ? 3 : 0,
        transition: 'box-shadow 120ms, border-color 120ms',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.5}
        sx={{
          px: 1,
          py: 0.5,
          flexShrink: 0,
          bgcolor: selected ? 'primary.main' : 'action.hover',
          color: selected ? 'primary.contrastText' : 'text.secondary',
        }}
      >
        <DragIndicatorIcon fontSize="small" sx={{ cursor: 'grab', flexShrink: 0 }} />
        <Chip
          label={QUESTION_TYPE_META[question.type].label}
          size="small"
          sx={{
            height: 18,
            fontSize: 10,
            bgcolor: selected ? 'rgba(255,255,255,0.25)' : undefined,
            color: 'inherit',
          }}
        />
        {question.required && (
          <Chip
            label="필수"
            size="small"
            sx={{
              height: 18,
              fontSize: 10,
              bgcolor: selected ? 'rgba(255,255,255,0.25)' : 'error.light',
              color: selected ? 'inherit' : '#fff',
            }}
          />
        )}
        {question.condition && (
          <Tooltip title="조건부 표시">
            <CallSplitIcon sx={{ fontSize: 14 }} />
          </Tooltip>
        )}
        <Box sx={{ flex: 1 }} />
        <IconButton
          size="small"
          className="rgl-no-drag"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          sx={{ color: 'inherit', p: 0.25 }}
        >
          <ContentCopyIcon sx={{ fontSize: 14 }} />
        </IconButton>
        <IconButton
          size="small"
          className="rgl-no-drag"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          sx={{ color: 'inherit', p: 0.25 }}
        >
          <DeleteOutlineIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Stack>
      <Box sx={{ p: 1, overflow: 'auto', flex: 1, minHeight: 0 }}>
        <Typography variant="body2" fontWeight={selected ? 700 : 400} sx={{ wordBreak: 'break-word' }}>
          {question.label || '(제목 없음)'}
        </Typography>
      </Box>
    </Box>
  );
}
