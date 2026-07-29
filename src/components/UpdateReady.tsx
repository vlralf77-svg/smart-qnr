// 업데이트 준비 완료 모달 — 새 버전 다운로드가 끝나면 '지금 재시작 / 나중에'를 예쁜 커스텀 모달로 안내.
//  (웹/브리지 없는 환경에서는 아무 동작 안 함)
import { forwardRef, ReactElement, Ref, useEffect, useState } from 'react';
import { Box, Button, Dialog, Fade, Stack, Typography } from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';

const Transition = forwardRef(function Transition(
  props: TransitionProps & { children: ReactElement },
  ref: Ref<unknown>,
) {
  return <Fade ref={ref} {...props} timeout={180} />;
});

export default function UpdateReady() {
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState<string | undefined>();

  useEffect(() => {
    const bridge = window.smartqnr;
    if (!bridge?.onUpdateStatus) return;
    const off = bridge.onUpdateStatus((s) => {
      if (s.state === 'ready') {
        setVersion(s.version);
        setOpen(true);
      }
    });
    return off;
  }, []);

  const later = () => setOpen(false);
  const restart = () => {
    setOpen(false);
    window.smartqnr?.restartForUpdate?.();
  };

  return (
    <Dialog
      open={open}
      onClose={later}
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        sx: {
          width: 372,
          maxWidth: '90vw',
          borderRadius: 4,
          overflow: 'hidden',
          textAlign: 'center',
          boxShadow: '0 24px 60px -18px rgba(15,23,42,0.55)',
        },
      }}
    >
      {/* 상단 아이콘 밴드 */}
      <Box sx={{ pt: 4, pb: 2.5, background: 'linear-gradient(180deg, #e6f5ee 0%, #ffffff 100%)' }}>
        <Box
          sx={{
            width: 68,
            height: 68,
            mx: 'auto',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#22a06b',
            color: '#fff',
            boxShadow: '0 8px 20px -8px rgba(34,160,107,0.6)',
          }}
        >
          <RocketLaunchRoundedIcon sx={{ fontSize: 32 }} />
        </Box>
      </Box>

      <Box sx={{ px: 3.5, pb: 3 }}>
        <Typography sx={{ fontSize: 19, fontWeight: 800, color: '#12213a', mb: 0.75 }}>
          업데이트 준비 완료
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
          {version ? (
            <>
              새 버전 <b style={{ color: '#167c50' }}>v{version}</b>이 준비되었습니다.
              <br />
            </>
          ) : (
            <>새 버전이 준비되었습니다.<br /></>
          )}
          지금 재시작하면 바로 적용됩니다. ‘나중에’를 선택하면
          <br />
          다음 종료 시 자동으로 설치됩니다.
        </Typography>

        <Stack direction="row" spacing={1.25} sx={{ mt: 3 }}>
          <Button
            fullWidth
            onClick={later}
            variant="outlined"
            size="large"
            sx={{
              borderRadius: 2.5,
              py: 1.1,
              fontWeight: 700,
              color: 'text.primary',
              borderColor: 'divider',
              '&:hover': { borderColor: 'text.disabled', bgcolor: 'action.hover' },
            }}
          >
            나중에
          </Button>
          <Button
            fullWidth
            onClick={restart}
            variant="contained"
            size="large"
            disableElevation
            sx={{
              borderRadius: 2.5,
              py: 1.1,
              fontWeight: 800,
              bgcolor: '#22a06b',
              '&:hover': { bgcolor: '#1c9160' },
            }}
          >
            지금 재시작
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
}
