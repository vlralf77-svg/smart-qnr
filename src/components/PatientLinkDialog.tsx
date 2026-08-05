// 환자에게 보낼 문진 링크 만들기 — 환자번호는 토큰으로 감춰서 URL 생성
import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { encodePatientToken } from '@/utils/patientToken';

interface Props {
  open: boolean;
  onClose: () => void;
}

// 배포 주소 기본값: 웹(http/https)이면 현재 주소, Electron(file://)이면 비움
function defaultBaseUrl(): string {
  try {
    const { origin, pathname, protocol } = window.location;
    if (protocol === 'http:' || protocol === 'https:') {
      // index.html 경로까지 유지(하위 경로 배포 대응)
      return origin + pathname.replace(/\/[^/]*$/, '/');
    }
  } catch {
    /* 무시 */
  }
  return '';
}

export default function PatientLinkDialog({ open, onClose }: Props) {
  const [base, setBase] = useState(defaultBaseUrl);
  const [patientNo, setPatientNo] = useState('');
  const [copied, setCopied] = useState(false);

  const link = useMemo(() => {
    const no = patientNo.trim();
    if (!no) return '';
    const b = base.trim().replace(/\/+$/, '');
    const token = encodePatientToken(no);
    return `${b}/#/patient/login?t=${token}`;
  }, [base, patientNo]);

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      /* clipboard 미지원 시 사용자가 직접 복사 */
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>환자 문진 링크 만들기</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            환자번호는 링크에 그대로 노출되지 않고 토큰으로 변환됩니다. 링크를 문자·메신저로 보내면
            환자는 번호 입력 없이 바로 문진 목록으로 들어갑니다.
          </Typography>

          <TextField
            label="배포 주소(기본 URL)"
            size="small"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            placeholder="https://병원도메인/"
            helperText="웹으로 접속하는 주소. 예: https://qnr.hospital.co.kr/"
            fullWidth
          />

          <TextField
            label="환자번호"
            size="small"
            value={patientNo}
            onChange={(e) => setPatientNo(e.target.value)}
            inputMode="numeric"
            placeholder="예: 0000011111"
            fullWidth
          />

          {link ? (
            <TextField
              label="보낼 링크"
              size="small"
              value={link}
              fullWidth
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="복사">
                      <IconButton edge="end" onClick={copy}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
          ) : (
            <Alert severity="info" variant="outlined">
              환자번호를 입력하면 링크가 만들어집니다.
            </Alert>
          )}

          {link && !base.trim() && (
            <Alert severity="warning" variant="outlined">
              배포 주소가 비어 있어 링크가 <b>/#/patient/…</b> 로만 만들어집니다. 환자가 접속하는
              실제 주소(예: https://병원도메인/)를 입력하세요.
            </Alert>
          )}
        </Stack>

        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            startIcon={<ContentCopyIcon />}
            onClick={copy}
            disabled={!link}
          >
            링크 복사
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message="링크가 복사되었습니다."
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Dialog>
  );
}
