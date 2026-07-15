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
import { FormSchema } from '@/types/schema';
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
  return (
    <Dialog fullScreen open={open} onClose={onClose} TransitionComponent={Transition}>
      <AppBar sx={{ position: 'relative' }} color="primary">
        <Toolbar>
          <Typography variant="h6" sx={{ flex: 1 }}>
            미리보기 — 응답 화면
          </Typography>
          <IconButton edge="end" color="inherit" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box sx={{ bgcolor: 'background.default', minHeight: '100%', py: 4 }}>
        <Container maxWidth="sm">
          <FormRenderer schema={schema} preview />
        </Container>
      </Box>
    </Dialog>
  );
}
