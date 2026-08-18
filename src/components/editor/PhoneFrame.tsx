// 미리보기를 실제 휴대폰에서 보는 것처럼 감싸는 기기 목업.
//  바깥 배경 + 기기 테두리(베젤) + 상태바(시각·신호·배터리) + 노치 + 홈 인디케이터.
//  화면 영역만 세로로 스크롤되므로, 실제 기기에서 보이는 만큼이 그대로 보인다.
import { useEffect, useState, type ReactNode } from 'react';
import { Box, alpha } from '@mui/material';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import WifiIcon from '@mui/icons-material/Wifi';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';

/** 기기 화면 논리 폭(px) — 일반적인 스마트폰 세로 기준 */
const SCREEN_W = 390;
const BEZEL = 11;

const clock = () =>
  new Date().toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

interface Props {
  children: ReactNode;
  /** 화면 최대 높이(px). 지정하지 않으면 부모 높이를 채운다. */
  maxHeight?: number;
}

export default function PhoneFrame({ children, maxHeight = 880 }: Props) {
  const [time, setTime] = useState(clock);

  // 상태바 시각을 1분마다 갱신(실제 기기처럼 보이게)
  useEffect(() => {
    const id = window.setInterval(() => setTime(clock()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        height: '100%',
        p: { xs: 1, sm: 2 },
        // 기기 뒤 배경 — 책상 위에 올려둔 느낌으로 은은한 그라데이션
        background: (t) =>
          `radial-gradient(120% 90% at 50% 0%, ${alpha(t.palette.primary.main, 0.1)} 0%, ${
            t.palette.mode === 'dark' ? '#0b1220' : '#e9edf3'
          } 60%)`,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: SCREEN_W + BEZEL * 2,
          height: '100%',
          maxHeight,
          minHeight: 420,
          p: `${BEZEL}px`,
          borderRadius: '46px',
          bgcolor: '#1b2130',
          boxShadow:
            '0 22px 45px rgba(15,23,42,.35), 0 2px 6px rgba(15,23,42,.25), inset 0 0 0 2px #2f3748',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* 측면 버튼 */}
        {[
          { top: 96, h: 26 },
          { top: 136, h: 46 },
          { top: 194, h: 46 },
        ].map((b) => (
          <Box
            key={b.top}
            sx={{
              position: 'absolute',
              left: -2,
              top: b.top,
              width: 3,
              height: b.h,
              borderRadius: 2,
              bgcolor: '#161c28',
            }}
          />
        ))}
        <Box
          sx={{
            position: 'absolute',
            right: -2,
            top: 150,
            width: 3,
            height: 70,
            borderRadius: 2,
            bgcolor: '#2f3748',
          }}
        />

        {/* 화면 */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            position: 'relative',
            borderRadius: '36px',
            overflow: 'hidden',
            bgcolor: 'background.default',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* 상태바 */}
          <Box
            sx={{
              flexShrink: 0,
              height: 36,
              px: 2.5,
              display: 'flex',
              alignItems: 'center',
              gap: 0.4,
              fontSize: 12.5,
              fontWeight: 700,
              color: 'text.primary',
              bgcolor: 'background.paper',
            }}
          >
            <Box component="span" sx={{ letterSpacing: '0.02em' }}>
              {time}
            </Box>
            <Box sx={{ flex: 1 }} />
            <SignalCellularAltIcon sx={{ fontSize: 15 }} />
            <WifiIcon sx={{ fontSize: 15 }} />
            <BatteryFullIcon sx={{ fontSize: 17, transform: 'rotate(90deg)' }} />
          </Box>

          {/* 노치(다이내믹 아일랜드) */}
          <Box
            sx={{
              position: 'absolute',
              top: 7,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 104,
              height: 26,
              borderRadius: 99,
              bgcolor: '#0d1119',
              zIndex: 3,
            }}
          />

          {/* 본문 — 여기만 스크롤된다 */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              px: 1.5,
              py: 1.5,
              bgcolor: 'background.default',
            }}
          >
            {children}
          </Box>

          {/* 홈 인디케이터 */}
          <Box
            sx={{
              flexShrink: 0,
              height: 20,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'background.default',
            }}
          >
            <Box
              sx={{
                width: 124,
                height: 4,
                borderRadius: 2,
                bgcolor: (t) => alpha(t.palette.text.primary, 0.35),
              }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
