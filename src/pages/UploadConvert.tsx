// QNR002 문서 업로드/변환
// 데스크톱(Electron) 앱: PDF/DOCX 업로드 → 텍스트 추출 → 로컬 규칙 기반 변환(오픈소스, 외부 API 미사용) → 초안 스키마.
// 웹(dev) 환경: 문서 변환은 데스크톱 전용, JSON 임포트/빈 문진만 제공.
// HWP/HWPX 는 후속 단계 지원 예정.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  Divider,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { parseLlmSchemaText } from '@/utils/schemaValidator';
import { createEmptyForm } from '@/utils/schemaFactory';
import { uid } from '@/utils/id';
import { useEditorStore } from '@/store/useEditorStore';
import { useFormsStore } from '@/store/useFormsStore';

const isElectron = typeof window !== 'undefined' && !!window.smartqnr?.isElectron;

export default function UploadConvert() {
  const navigate = useNavigate();
  const { loadForm } = useEditorStore();
  const { saveForm } = useFormsStore();

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [text, setText] = useState('');

  const openInEditor = (schema: ReturnType<typeof createEmptyForm>, warn: string[]) => {
    setWarnings(warn);
    saveForm(schema);
    loadForm(schema);
    navigate(`/editor/${schema.id}`);
  };

  // 데스크톱: 문서 파일 → 로컬 규칙 기반 변환(오픈소스, 네트워크 미사용)
  const handleDocument = async (file: File) => {
    setError('');
    setWarnings([]);
    setBusy(true);
    try {
      setProgress(`"${file.name}" 텍스트 추출 및 변환 중…`);
      const data = await file.arrayBuffer();
      const { schemaText, rawText } = await window.smartqnr!.convertDocument({
        fileName: file.name,
        data,
      });
      try {
        const { schema, warnings } = parseLlmSchemaText(schemaText);
        openInEditor(schema, warnings);
      } catch {
        // §6.3 폴백: 파싱 실패 시 원문을 info 문항으로 담은 빈 문진 제공
        const fb = createEmptyForm(`${file.name} (변환 초안)`);
        fb.sections[0].questions.push({
          id: uid('q'),
          type: 'info',
          label: '자동 변환에 실패하여 원문을 그대로 담았습니다. 아래 내용을 참고해 문항을 직접 구성하세요.\n\n' + rawText.slice(0, 4000),
        });
        openInEditor(fb, ['변환 결과 파싱 실패 → 원문 기반 빈 문진으로 폴백']);
      }
    } catch (e) {
      setError('변환 실패: ' + (e as Error).message);
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  // JSON 임포트 (웹/데스크톱 공통)
  const handleImport = () => {
    setError('');
    try {
      const { schema, warnings } = parseLlmSchemaText(text);
      openInEditor(schema, warnings);
    } catch (e) {
      setError('JSON 파싱 실패: ' + (e as Error).message);
    }
  };

  const handleJsonFile = async (file: File) => {
    setText(await file.text());
    setError('');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar variant="dense">
          <Button color="inherit" startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
            목록
          </Button>
          <Typography variant="subtitle1" sx={{ ml: 1 }}>
            문서 → 문진 변환
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          자동 변환 결과는 항상 <b>초안</b>입니다. 반드시 에디터에서 검수·수정하세요. 현재 <b>PDF·DOCX</b>를
          지원하며 <b>HWP/HWPX</b>는 후속 단계에서 추가됩니다. 변환은 <b>로컬 규칙 기반(오픈소스)</b>으로
          동작하며 외부 API를 호출하지 않습니다.
        </Alert>

        {/* 1. 문서 파일 변환 (데스크톱 전용) */}
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <Typography variant="subtitle1" fontWeight={700}>
              문서 파일에서 자동 변환
            </Typography>
            <Chip
              size="small"
              label={isElectron ? '데스크톱 앱 · 로컬 처리' : '데스크톱 앱 전용'}
              color={isElectron ? 'success' : 'default'}
            />
          </Stack>

          {!isElectron ? (
            <Alert severity="warning" sx={{ mt: 1 }}>
              문서 파일 변환은 <b>SmartQnR 데스크톱(.exe) 앱</b>에서만 동작합니다. 웹 환경에서는 아래 JSON
              임포트 또는 빈 문진을 이용하세요.
            </Alert>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" mb={2}>
                정규식·휴리스틱으로 섹션·문항·선택지·유형을 추론합니다(외부 서버 전송 없음, 완전 오프라인
                동작). 표현이 다양한 양식은 정확도가 낮을 수 있으니 변환 후 에디터에서 꼭 확인하세요.
              </Typography>

              <Button
                component="label"
                variant="contained"
                startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
                disabled={busy}
              >
                {busy ? '변환 중…' : 'PDF · DOCX 파일 선택'}
                <input
                  hidden
                  type="file"
                  accept=".pdf,.docx"
                  onChange={(e) => e.target.files?.[0] && handleDocument(e.target.files[0])}
                />
              </Button>

              <Collapse in={!!progress}>
                <Alert severity="info" icon={<CircularProgress size={18} />} sx={{ mt: 2 }}>
                  {progress}
                </Alert>
              </Collapse>
            </>
          )}
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        {warnings.length > 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            보정 사항: {warnings.join(' / ')}
          </Alert>
        )}

        {/* 2. JSON 임포트 */}
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            변환 결과(JSON) 직접 임포트
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            §3.1 문진 스키마 형식의 JSON을 붙여넣거나 파일로 업로드하세요. 알 수 없는 필드는 안전하게
            보정합니다.
          </Typography>
          <Button component="label" variant="outlined" startIcon={<UploadFileIcon />} sx={{ mb: 2 }}>
            JSON 파일 선택
            <input
              hidden
              type="file"
              accept=".json,application/json,.txt"
              onChange={(e) => e.target.files?.[0] && handleJsonFile(e.target.files[0])}
            />
          </Button>
          <TextField
            multiline
            minRows={8}
            fullWidth
            placeholder='{ "title": "...", "sections": [ ... ] }'
            value={text}
            onChange={(e) => setText(e.target.value)}
            sx={{ mb: 2, fontFamily: 'monospace' }}
          />
          <Button variant="contained" onClick={handleImport} disabled={!text.trim()}>
            임포트하여 편집
          </Button>
        </Paper>

        <Divider sx={{ my: 3 }}>또는</Divider>

        {/* 3. 빈 문진 */}
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                빈 문진에서 직접 작성
              </Typography>
              <Typography variant="body2" color="text.secondary">
                변환 없이 처음부터 문항을 구성합니다. (파싱 실패 시 폴백 경로)
              </Typography>
            </Box>
            <Button variant="outlined" onClick={() => navigate('/editor/new')}>
              빈 문진 시작
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
