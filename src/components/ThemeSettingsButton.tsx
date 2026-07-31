// 테마 설정 버튼 — 강조 색상(프리셋 + 커스텀 슬라이더) 선택 + 다크 모드 토글. 상단 바(AppBar)에 배치.
import { useEffect, useState } from 'react';
import {
  Box,
  Divider,
  FormControlLabel,
  IconButton,
  Menu,
  Slider,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import CheckIcon from '@mui/icons-material/Check';
import TuneIcon from '@mui/icons-material/Tune';
import { BRAND_PRESETS, hexToHsl, hslToHex } from '@/theme';
import { useThemeSettings } from '@/store/useThemeSettings';

const HUE_GRADIENT =
  'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)';

export default function ThemeSettingsButton() {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const { brand, customColor, mode, setBrand, setCustomColor, toggleMode } = useThemeSettings();

  // 커스텀 슬라이더용 로컬 HSL 상태 (열 때 현재 색으로 동기화)
  const [hsl, setHsl] = useState(() => hexToHsl(customColor));
  useEffect(() => {
    if (anchor) setHsl(hexToHsl(customColor));
    // 메뉴를 열 때만 현재 색으로 초기화
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor]);

  const isCustom = brand === 'custom';
  const preview = isCustom ? customColor : hslToHex(hsl.h, hsl.s, hsl.l);

  const update = (patch: Partial<typeof hsl>) => {
    const next = { ...hsl, ...patch };
    setHsl(next);
    setCustomColor(hslToHex(next.h, next.s, next.l)); // brand 를 custom 으로 전환
  };

  const sliderSx = (rail: string) => ({
    py: 0.5,
    color: 'transparent',
    '& .MuiSlider-rail': { opacity: 1, height: 10, borderRadius: 5, background: rail },
    '& .MuiSlider-track': { border: 0, height: 10, background: 'transparent' },
    '& .MuiSlider-thumb': {
      width: 16,
      height: 16,
      bgcolor: '#fff',
      border: '2px solid rgba(0,0,0,0.35)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
    },
  });

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
        PaperProps={{ sx: { p: 1.5, width: 288 } }}
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

        <Divider sx={{ my: 1.25 }} />
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ px: 0.5, mb: 1 }}>
          <TuneIcon fontSize="small" color="action" />
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
            커스텀 색상
          </Typography>
          <Box
            sx={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              bgcolor: preview,
              border: '2px solid',
              borderColor: isCustom ? 'text.primary' : 'divider',
            }}
          />
          <Typography
            variant="caption"
            sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary', minWidth: 64 }}
          >
            {preview.toUpperCase()}
          </Typography>
        </Stack>

        <Box sx={{ px: 1 }}>
          <Typography variant="caption" color="text.disabled">
            색상(Hue)
          </Typography>
          <Slider
            value={hsl.h}
            min={0}
            max={360}
            onChange={(_e, v) => update({ h: v as number })}
            sx={sliderSx(HUE_GRADIENT)}
          />
          <Typography variant="caption" color="text.disabled">
            채도(Saturation)
          </Typography>
          <Slider
            value={hsl.s}
            min={0}
            max={100}
            onChange={(_e, v) => update({ s: v as number })}
            sx={sliderSx(
              `linear-gradient(to right, ${hslToHex(hsl.h, 0, hsl.l)}, ${hslToHex(hsl.h, 100, hsl.l)})`,
            )}
          />
          <Typography variant="caption" color="text.disabled">
            밝기(Lightness)
          </Typography>
          <Slider
            value={hsl.l}
            min={0}
            max={100}
            onChange={(_e, v) => update({ l: v as number })}
            sx={sliderSx(
              `linear-gradient(to right, #000, ${hslToHex(hsl.h, hsl.s, 50)}, #fff)`,
            )}
          />
        </Box>
      </Menu>
    </>
  );
}
