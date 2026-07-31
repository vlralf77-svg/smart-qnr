// 공용 확인 다이얼로그 — 종료/로그아웃 등 되돌리기 어려운 동작 전 확인.
import { forwardRef, ReactElement, ReactNode, Ref } from 'react';
import { Box, Button, Dialog, Fade, Stack, Typography, alpha } from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';

const Transition = forwardRef(function Transition(
  props: TransitionProps & { children: ReactElement },
  ref: Ref<unknown>,
) {
  return <Fade ref={ref} {...props} timeout={180} />;
});

interface Props {
  open: boolean;
  title: string;
  message?: ReactNode;
  icon?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 확인 버튼 강조색 (기본: 브랜드 그린) */
  confirmColor?: string;
  confirmHoverColor?: string;
  /** 아이콘 밴드 배경/아이콘색 */
  iconBg?: string;
  iconColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  icon,
  confirmLabel = '확인',
  cancelLabel = '취소',
  // 색을 지정하지 않으면 테마 강조색을 따름
  confirmColor,
  confirmHoverColor,
  iconBg,
  iconColor,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
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
      {icon && (
        <Box
          sx={{
            pt: 4,
            pb: 2.5,
            background: (t) =>
              t.palette.mode === 'dark'
                ? 'transparent'
                : 'linear-gradient(180deg, #f4f8f6 0%, #ffffff 100%)',
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
              bgcolor: iconBg ?? ((t) => alpha(t.palette.primary.main, 0.14)),
              color: iconColor ?? 'primary.dark',
              boxShadow: (t) =>
                `0 8px 20px -8px ${alpha(iconColor ?? t.palette.primary.main, 0.4)}`,
            }}
          >
            {icon}
          </Box>
        </Box>
      )}

      <Box sx={{ px: 3.5, pb: 3, pt: icon ? 0 : 4 }}>
        <Typography sx={{ fontSize: 19, fontWeight: 800, color: 'text.primary', mb: 0.75 }}>
          {title}
        </Typography>
        {message && (
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
            {message}
          </Typography>
        )}

        <Stack direction="row" spacing={1.25} sx={{ mt: 3 }}>
          <Button
            fullWidth
            onClick={onCancel}
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
            {cancelLabel}
          </Button>
          <Button
            fullWidth
            onClick={onConfirm}
            variant="contained"
            size="large"
            disableElevation
            sx={{
              borderRadius: 2.5,
              py: 1.1,
              fontWeight: 800,
              bgcolor: confirmColor ?? 'primary.main',
              '&:hover': { bgcolor: confirmHoverColor ?? 'primary.dark' },
            }}
          >
            {confirmLabel}
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
}
