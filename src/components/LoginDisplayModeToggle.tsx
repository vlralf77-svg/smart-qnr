// 로그인 화면용 화면 크기(PC/모바일) 선택 토글 — 밝은 글래스 카드에 어울리는 알약형.
//  선택 즉시 Electron 창 크기를 조절(useDisplayMode → IPC). 웹에서는 레이아웃만 바뀜.
import { Stack, ToggleButton, ToggleButtonGroup, Typography, alpha, useMediaQuery } from '@mui/material';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import { useDisplayMode } from '@/store/useDisplayMode';

export default function LoginDisplayModeToggle() {
  const { mode, setMode } = useDisplayMode();
  const narrow = useMediaQuery('(max-width:899px)');
  // 'auto'면 현재 화면폭 기준으로 실제 적용 중인 쪽을 선택 표시
  const effective = mode === 'auto' ? (narrow ? 'mobile' : 'pc') : mode;

  return (
    <Stack alignItems="center" spacing={0.5}>
      <Typography variant="caption" color="text.secondary" fontWeight={700}>
        화면 크기
      </Typography>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={effective}
        onChange={(_e, v) => v && setMode(v)}
        sx={{
          bgcolor: 'rgba(15,23,42,0.06)',
          borderRadius: '999px',
          p: '3px',
          '& .MuiToggleButton-root': {
            border: 0,
            borderRadius: '999px !important',
            px: 1.75,
            py: 0.35,
            gap: 0.5,
            fontSize: 12.5,
            fontWeight: 700,
            lineHeight: 1.2,
            color: 'text.secondary',
            '&.Mui-selected': {
              bgcolor: 'primary.main',
              color: '#fff',
              boxShadow: (t) => `0 6px 14px -6px ${alpha(t.palette.primary.main, 0.7)}`,
              '&:hover': { bgcolor: 'primary.dark' },
            },
          },
        }}
      >
        <ToggleButton value="pc">
          <LaptopMacIcon fontSize="small" sx={{ mr: 0.5 }} />
          PC
        </ToggleButton>
        <ToggleButton value="mobile">
          <SmartphoneIcon fontSize="small" sx={{ mr: 0.5 }} />
          모바일
        </ToggleButton>
      </ToggleButtonGroup>
    </Stack>
  );
}
