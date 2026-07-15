// 아웃라인의 문항 1행 (선택/삭제/복제 + 드래그 핸들)
import { Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import { Question, QUESTION_TYPE_META } from '@/types/schema';

interface Props {
  question: Question;
  index: number;
  selected: boolean;
  dragHandleProps: Record<string, unknown>;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export default function QuestionRow({
  question,
  index,
  selected,
  dragHandleProps,
  onSelect,
  onDuplicate,
  onDelete,
}: Props) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.5}
      onClick={onSelect}
      sx={{
        px: 0.5,
        py: 0.75,
        borderRadius: 1.5,
        cursor: 'pointer',
        bgcolor: selected ? 'primary.main' : 'transparent',
        color: selected ? 'primary.contrastText' : 'text.primary',
        '&:hover': { bgcolor: selected ? 'primary.main' : 'action.hover' },
      }}
    >
      <Box
        {...dragHandleProps}
        onClick={(e) => e.stopPropagation()}
        sx={{ cursor: 'grab', display: 'flex', color: selected ? 'inherit' : 'text.disabled' }}
      >
        <DragIndicatorIcon fontSize="small" />
      </Box>

      <Typography variant="caption" sx={{ width: 20, opacity: 0.7, flexShrink: 0 }}>
        {index + 1}
      </Typography>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" noWrap fontWeight={selected ? 700 : 400}>
          {question.label || '(제목 없음)'}
        </Typography>
      </Box>

      {question.condition && (
        <Tooltip title="조건부 표시">
          <CallSplitIcon fontSize="small" sx={{ opacity: 0.7 }} />
        </Tooltip>
      )}
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
      <Chip
        label={QUESTION_TYPE_META[question.type].label}
        size="small"
        variant="outlined"
        sx={{
          height: 18,
          fontSize: 10,
          borderColor: selected ? 'rgba(255,255,255,0.5)' : 'divider',
          color: 'inherit',
        }}
      />

      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          onDuplicate();
        }}
        sx={{ color: 'inherit' }}
      >
        <ContentCopyIcon sx={{ fontSize: 16 }} />
      </IconButton>
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        sx={{ color: 'inherit' }}
      >
        <DeleteOutlineIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Stack>
  );
}
