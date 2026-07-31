// 글자 크기(작게/중간/크게) 전환 토글 — 환자 문진 화면 상단(색 있는 AppBar)에 배치.
import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import { FontScale, useFontScale } from '@/store/useFontScale';

export default function FontScaleToggle() {
  const { scale, setScale } = useFontScale();

  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={scale}
      onChange={(_e, v) => {
        if (v) setScale(v as FontScale);
      }}
      sx={{
        bgcolor: 'rgba(255,255,255,0.15)',
        borderRadius: 2,
        '& .MuiToggleButton-root': {
          color: 'inherit',
          border: 'none',
          px: 1,
          py: 0.25,
          fontWeight: 800,
          lineHeight: 1,
          '&.Mui-selected': {
            bgcolor: 'rgba(255,255,255,0.9)',
            color: 'secondary.main',
            '&:hover': { bgcolor: '#fff' },
          },
        },
      }}
    >
      <Tooltip title="작게">
        <ToggleButton value="sm" sx={{ fontSize: 12 }}>
          가
        </ToggleButton>
      </Tooltip>
      <Tooltip title="중간">
        <ToggleButton value="md" sx={{ fontSize: 15 }}>
          가
        </ToggleButton>
      </Tooltip>
      <Tooltip title="크게">
        <ToggleButton value="lg" sx={{ fontSize: 19 }}>
          가
        </ToggleButton>
      </Tooltip>
    </ToggleButtonGroup>
  );
}
