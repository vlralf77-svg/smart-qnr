// 상단 컴포넌트 팔레트 — 아이콘만 표시(툴팁으로 한글명)
//  · 클릭: 대상 섹션 맨 아래에 문항 추가
//  · 드래그: 섹션 캔버스의 원하는 자리에 끌어다 놓으면 그 위치에 추가
import type { JSX } from 'react';
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
import { usePaletteDrag } from './paletteDrag';

// 팔레트에 노출할 유형(서명 제외) + 아이콘 — 순서대로 F1, F2, … 단축키가 부여됨
export const PALETTE_ITEMS: { type: QuestionType; icon: JSX.Element }[] = [
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
  const { type: dragging, setType } = usePaletteDrag();

  return (
    <Paper variant="outlined" sx={{ px: 1, py: 0.75, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexWrap: 'wrap' }}>
        <Tooltip
          title="클릭하면 맨 아래에 추가됩니다. 원하는 자리에 놓으려면 아이콘을 섹션으로 끌어다 놓으세요. 섹션을 클릭한 뒤 F1~ 단축키로도 추가할 수 있어요."
          arrow
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 700, px: 0.75, mr: 0.25, cursor: 'default' }}
          >
            컴포넌트 <span style={{ opacity: 0.6, fontWeight: 400 }}>(F1~ · 끌어놓기)</span>
          </Typography>
        </Tooltip>
        {PALETTE_ITEMS.map(({ type, icon }, i) => {
          const meta = QUESTION_TYPE_META[type];
          const fkey = `F${i + 1}`;
          const title = meta.hint
            ? `${fkey} · ${meta.label} · ${meta.hint}`
            : `${fkey} · ${meta.label}`;
          return (
            <Tooltip key={type} title={`${title} — 끌어다 놓으면 그 위치에 추가`} arrow>
              <IconButton
                size="small"
                onClick={() => onAdd(type)}
                aria-label={`${meta.label} (${fkey})`}
                // 캔버스의 원하는 위치로 끌어다 놓기(react-grid-layout 의 droppable 과 연동)
                draggable
                onDragStart={(e) => {
                  // Firefox 는 데이터가 있어야 드래그가 시작된다
                  e.dataTransfer.setData('text/plain', type);
                  e.dataTransfer.effectAllowed = 'copy';
                  setType(type);
                }}
                onDragEnd={() => setType(null)}
                sx={{
                  color: dragging === type ? 'primary.main' : 'text.secondary',
                  bgcolor: dragging === type ? 'action.selected' : 'transparent',
                  borderRadius: 1.5,
                  cursor: 'grab',
                  '&:active': { cursor: 'grabbing' },
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
