// PC/모바일 표시 전환 토글 — 환자 문진 화면 상단에 배치(색 있는 AppBar 대응).
import { ToggleButton, ToggleButtonGroup, Tooltip, useMediaQuery } from '@mui/material';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import { useDisplayMode } from '@/store/useDisplayMode';

export default function DisplayModeToggle() {
  const { mode, setMode } = useDisplayMode();
  const auto = useMediaQuery('(max-width:899px)');
  // 'auto'면 현재 화면폭 기준으로 실제 적용 중인 쪽을 선택 표시
  const effective = mode === 'auto' ? (auto ? 'mobile' : 'pc') : mode;

  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={effective}
      onChange={(_e, v) => {
        if (v) setMode(v);
      }}
      sx={{
        bgcolor: 'rgba(255,255,255,0.15)',
        borderRadius: 2,
        '& .MuiToggleButton-root': {
          color: 'inherit',
          border: 'none',
          px: 1,
          py: 0.25,
          '&.Mui-selected': {
            bgcolor: 'rgba(255,255,255,0.9)',
            color: 'secondary.main',
            '&:hover': { bgcolor: '#fff' },
          },
        },
      }}
    >
      <Tooltip title="PC 화면으로 보기">
        <ToggleButton value="pc">
          <LaptopMacIcon fontSize="small" />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="모바일 화면으로 보기">
        <ToggleButton value="mobile">
          <SmartphoneIcon fontSize="small" />
        </ToggleButton>
      </Tooltip>
    </ToggleButtonGroup>
  );
}
