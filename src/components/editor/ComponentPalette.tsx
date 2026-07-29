// 상단 컴포넌트 팔레트 — 아이콘만 표시(툴팁으로 한글명), 클릭 시 대상 섹션에 문항 삽입
import { Box, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import ArrowDropDownCircleOutlinedIcon from '@mui/icons-material/ArrowDropDownCircleOutlined';
import ShortTextIcon from '@mui/icons-material/ShortText';
import NotesIcon from '@mui/icons-material/Notes';
import NumbersIcon from '@mui/icons-material/Numbers';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import LinearScaleIcon from '@mui/icons-material/LinearScale';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import { QuestionType, QUESTION_TYPE_META } from '@/types/schema';

// 팔레트에 노출할 유형(서명 제외) + 아이콘
const ITEMS: { type: QuestionType; icon: JSX.Element }[] = [
  { type: 'radio', icon: <RadioButtonCheckedIcon fontSize="small" /> },
  { type: 'checkbox', icon: <CheckBoxIcon fontSize="small" /> },
  { type: 'select', icon: <ArrowDropDownCircleOutlinedIcon fontSize="small" /> },
  { type: 'text', icon: <ShortTextIcon fontSize="small" /> },
  { type: 'textarea', icon: <NotesIcon fontSize="small" /> },
  { type: 'number', icon: <NumbersIcon fontSize="small" /> },
  { type: 'date', icon: <CalendarTodayIcon fontSize="small" /> },
  { type: 'boolean', icon: <ToggleOnIcon fontSize="small" /> },
  { type: 'scale', icon: <LinearScaleIcon fontSize="small" /> },
  { type: 'info', icon: <InfoOutlinedIcon fontSize="small" /> },
  { type: 'image', icon: <ImageOutlinedIcon fontSize="small" /> },
];

interface Props {
  /** 유형 선택 시 호출 — 대상 섹션에 문항 추가 */
  onAdd: (type: QuestionType) => void;
}

export default function ComponentPalette({ onAdd }: Props) {
  return (
    <Paper variant="outlined" sx={{ px: 1, py: 0.75, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexWrap: 'wrap' }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 700, px: 0.75, mr: 0.25 }}
        >
          컴포넌트
        </Typography>
        {ITEMS.map(({ type, icon }) => {
          const meta = QUESTION_TYPE_META[type];
          const title = meta.hint ? `${meta.label} · ${meta.hint}` : meta.label;
          return (
            <Tooltip key={type} title={title} arrow>
              <IconButton
                size="small"
                onClick={() => onAdd(type)}
                aria-label={meta.label}
                sx={{
                  color: 'text.secondary',
                  borderRadius: 1.5,
                  '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
                }}
              >
                {icon}
              </IconButton>
            </Tooltip>
          );
        })}
      </Box>
    </Paper>
  );
}
