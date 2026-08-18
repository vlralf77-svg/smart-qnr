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
import Tooltip from '@mui/material/Tooltip';
import CloseIcon from '@mui/icons-material/Close';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import DesktopWindowsOutlinedIcon from '@mui/icons-material/DesktopWindowsOutlined';
import { forwardRef, ReactElement, Ref, useState } from 'react';
import { FormSchema, isOverlayForm } from '@/types/schema';
import FormRenderer from '@/components/renderer/FormRenderer';
import PhoneFrame from './PhoneFrame';

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
  // 기기 목업(휴대폰 화면처럼) — 넓게 봐야 하는 오버레이 문진에는 쓰지 않는다
  const [phone, setPhone] = useState(true);
  const asPhone = phone && !wide;

  return (
    <Dialog fullScreen open={open} onClose={onClose} TransitionComponent={Transition}>
      <AppBar sx={{ position: 'sticky', top: 0 }} color="primary">
        <Toolbar>
          <Typography variant="h6" sx={{ flex: 1 }}>
            미리보기 — 응답 화면
          </Typography>
          {!wide && (
            <Tooltip title={phone ? '넓게 보기' : '휴대폰 화면처럼 보기'}>
              <IconButton color="inherit" onClick={() => setPhone((v) => !v)}>
                {phone ? <PhoneIphoneIcon /> : <DesktopWindowsOutlinedIcon />}
              </IconButton>
            </Tooltip>
          )}
          <IconButton edge="end" color="inherit" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {asPhone ? (
        // 툴바(64px)를 뺀 높이를 채워 기기 화면 안에서만 스크롤되게 한다
        <Box sx={{ height: 'calc(100vh - 64px)' }}>
          <PhoneFrame maxHeight={920}>
            <FormRenderer schema={schema} preview />
          </PhoneFrame>
        </Box>
      ) : (
        <Box sx={{ bgcolor: 'background.default', minHeight: '100%', py: wide ? 2 : 4 }}>
          <Container
            maxWidth={wide ? false : 'sm'}
            sx={{ px: wide ? { xs: 1.5, sm: 3 } : undefined }}
          >
            <FormRenderer schema={schema} preview overlayFit={wide} />
          </Container>
        </Box>
      )}
    </Dialog>
  );
}
