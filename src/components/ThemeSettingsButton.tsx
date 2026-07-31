// 테마 설정 버튼 — 강조 색상 선택 + 다크 모드 토글. 상단 바(AppBar)에 배치.
import { useState } from 'react';
import {
  Box,
  Divider,
  FormControlLabel,
  IconButton,
  Menu,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import CheckIcon from '@mui/icons-material/Check';
import { BRAND_PRESETS } from '@/theme';
import { useThemeSettings } from '@/store/useThemeSettings';

export default function ThemeSettingsButton() {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const { brand, mode, setBrand, toggleMode } = useThemeSettings();

  return (
    <>
      <Tooltip title="테마 설정 (색상·다크모드)">
        <IconButton color="inherit" size="small" onClick={(e) => setAnchor(e.currentTarget)}>
          <PaletteOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { p: 1.5, width: 268 } }}
      >
        <Typography variant="subtitle2" fontWeight={800} sx={{ px: 0.5, mb: 0.5 }}>
          테마 설정
        </Typography>
        <FormControlLabel
          sx={{ ml: 0, mr: 0, width: '100%', justifyContent: 'space-between' }}
          labelPlacement="start"
          control={<Switch checked={mode === 'dark'} onChange={toggleMode} />}
          label={
            <Stack direction="row" spacing={1} alignItems="center">
              <DarkModeOutlinedIcon fontSize="small" />
              <span>다크 모드</span>
            </Stack>
          }
        />
        <Divider sx={{ my: 1 }} />
        <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
          강조 색상
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 1,
            mt: 1,
            px: 0.5,
          }}
        >
          {BRAND_PRESETS.map((p) => {
            const on = p.key === brand;
            return (
              <Tooltip key={p.key} title={p.label}>
                <Box
                  role="button"
                  aria-label={p.label}
                  onClick={() => setBrand(p.key)}
                  sx={{
                    cursor: 'pointer',
                    height: 40,
                    borderRadius: 2,
                    bgcolor: p.main,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    border: '2px solid',
                    borderColor: on ? 'text.primary' : 'transparent',
                    transition: 'transform .1s',
                    '&:hover': { transform: 'translateY(-1px)' },
                  }}
                >
                  {on && <CheckIcon fontSize="small" />}
                </Box>
              </Tooltip>
            );
          })}
        </Box>
      </Menu>
    </>
  );
}
