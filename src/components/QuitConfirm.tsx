// 종료 확인 모달 — Electron 창 닫기 시도 시 예쁜 커스텀 다이얼로그로 확인.
//  (웹/브리지 없는 환경에서는 아무 동작 안 함)
import { forwardRef, ReactElement, Ref, useEffect, useState } from 'react';
import { Box, Button, Dialog, Fade, Stack, Typography } from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import PowerSettingsNewRoundedIcon from '@mui/icons-material/PowerSettingsNewRounded';

const Transition = forwardRef(function Transition(
  props: TransitionProps & { children: ReactElement },
  ref: Ref<unknown>,
) {
  return <Fade ref={ref} {...props} timeout={180} />;
});

export default function QuitConfirm() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const bridge = window.smartqnr;
    if (!bridge?.onQuitRequest) return;
    const off = bridge.onQuitRequest(() => setOpen(true));
    return off;
  }, []);

  const cancel = () => setOpen(false);
  const quit = () => {
    setOpen(false);
    window.smartqnr?.confirmQuit?.();
  };

  return (
    <Dialog
      open={open}
      onClose={cancel}
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        sx: {
          width: 360,
          maxWidth: '90vw',
          borderRadius: 4,
          overflow: 'hidden',
          textAlign: 'center',
          boxShadow: '0 24px 60px -18px rgba(15,23,42,0.55)',
        },
      }}
    >
      {/* 상단 아이콘 밴드 */}
      <Box
        sx={{
          pt: 4,
          pb: 2.5,
          background: 'linear-gradient(180deg, #f2f7fd 0%, #ffffff 100%)',
        }}
      >
        <Box
          sx={{
            width: 68,
            height: 68,
            mx: 'auto',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#fdecec',
            color: '#e5484d',
            boxShadow: '0 8px 20px -8px rgba(229,72,77,0.5)',
          }}
        >
          <PowerSettingsNewRoundedIcon sx={{ fontSize: 34 }} />
        </Box>
      </Box>

      <Box sx={{ px: 3.5, pb: 3 }}>
        <Typography sx={{ fontSize: 19, fontWeight: 800, color: '#12213a', mb: 0.75 }}>
          종료하시겠습니까?
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
          SmartQnR 문진관리 프로그램을 종료합니다.
          <br />
          저장하지 않은 변경사항은 사라질 수 있습니다.
        </Typography>

        <Stack direction="row" spacing={1.25} sx={{ mt: 3 }}>
          <Button
            fullWidth
            onClick={cancel}
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
            취소
          </Button>
          <Button
            fullWidth
            onClick={quit}
            variant="contained"
            size="large"
            disableElevation
            sx={{
              borderRadius: 2.5,
              py: 1.1,
              fontWeight: 800,
              bgcolor: '#e5484d',
              '&:hover': { bgcolor: '#cf3b40' },
            }}
          >
            종료
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
}
