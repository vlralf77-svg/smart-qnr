// 상단 컴포넌트 팔레트 — 유형을 클릭하면 대상 섹션에 문항으로 삽입
import { Box, Paper, Typography } from '@mui/material';
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
    <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
      <Typography variant="overline" color="text.secondary">
        컴포넌트
      </Typography>
      <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 1 }}>
        원하는 유형을 클릭하면 문진에 추가됩니다.
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))',
          gap: 1,
        }}
      >
        {ITEMS.map(({ type, icon }) => (
          <Box
            key={type}
            role="button"
            tabIndex={0}
            onClick={() => onAdd(type)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onAdd(type);
              }
            }}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
              py: 1,
              px: 0.5,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              cursor: 'pointer',
              color: 'text.secondary',
              textAlign: 'center',
              userSelect: 'none',
              transition: 'all .12s',
              '&:hover': {
                borderColor: 'primary.main',
                color: 'primary.main',
                bgcolor: 'action.hover',
              },
            }}
          >
            {icon}
            <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1.1 }}>
              {QUESTION_TYPE_META[type].label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
