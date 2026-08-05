// 편집 중 문진 실시간 미리보기 (§4.3) — 응답 화면과 동일 렌더
import {
  AppBar,
  Box,
  Container,
  Dialog,
  IconButton,
  Slide,
  Toolbar,
  Typography,
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import CloseIcon from '@mui/icons-material/Close';
import { forwardRef, ReactElement, Ref } from 'react';
import { FormSchema, isOverlayForm } from '@/types/schema';
import FormRenderer from '@/components/renderer/FormRenderer';

const Transition = forwardRef(function Transition(
  props: TransitionProps & { children: ReactElement },
  ref: Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface Props {
  open: boolean;
  schema: FormSchema;
  onClose: () => void;
}

export default function PreviewDialog({ open, schema, onClose }: Props) {
  // PDF 오버레이 문진은 원본 그대로 여러 페이지를 넓게 — 전체 폭 + 여러 페이지 동시 보기
  const wide = isOverlayForm(schema) && !schema.canvas;
  return (
    <Dialog fullScreen open={open} onClose={onClose} TransitionComponent={Transition}>
      <AppBar sx={{ position: 'sticky', top: 0 }} color="primary">
        <Toolbar>
          <Typography variant="h6" sx={{ flex: 1 }}>
            미리보기 — 응답 화면
          </Typography>
          <IconButton edge="end" color="inherit" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box sx={{ bgcolor: 'background.default', minHeight: '100%', py: wide ? 2 : 4 }}>
        <Container
          maxWidth={wide ? false : 'sm'}
          sx={{ px: wide ? { xs: 1.5, sm: 3 } : undefined }}
        >
          <FormRenderer schema={schema} preview overlayFit={wide} />
        </Container>
      </Box>
    </Dialog>
  );
}
