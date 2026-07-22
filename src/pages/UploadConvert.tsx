// QNR002 문서 업로드/변환
//  - PDF: pdfjs 로 원본 그대로 배경 렌더 + 입력필드 오버레이 (웹/데스크톱 모두, 외부 API 미사용)
//  - DOCX: 로컬 규칙 기반 텍스트 변환 (데스크톱 앱 전용)
//  - JSON 임포트 / 빈 문진: 어디서나
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
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import { parseLlmSchemaText } from '@/utils/schemaValidator';
import { createEmptyForm } from '@/utils/schemaFactory';
import { pdfToOverlayForm } from '@/utils/pdfImport';
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

  const openInEditor = async (schema: ReturnType<typeof createEmptyForm>, warn: string[]) => {
    setWarnings(warn);
    try {
      await saveForm(schema);
    } catch (e) {
      setError('저장 실패: ' + (e as Error).message);
      return;
    }
    loadForm(schema);
    navigate(`/editor/${schema.id}`);
  };

  // PDF → 원본 배경 + 입력필드 오버레이 (웹/데스크톱 공통, pdfjs 로컬 처리)
  const handlePdf = async (file: File) => {
    setError('');
    setWarnings([]);
    setBusy(true);
    try {
      setProgress(`"${file.name}" 페이지 렌더링 및 필드 자동 배치 중…`);
      const data = await file.arrayBuffer();
      const { schema, pageCount, fieldCount } = await pdfToOverlayForm(data, file.name);
      await openInEditor(schema, [
        `${pageCount}개 페이지, 필드 ${fieldCount}개 자동 배치됨 — 위치·유형을 확인·조정하세요`,
      ]);
    } catch (e) {
      setError('PDF 변환 실패: ' + (e as Error).message);
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  // DOCX → 로컬 규칙 기반 텍스트 변환 (데스크톱 앱 전용, 외부 API 미사용)
  const handleDocx = async (file: File) => {
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
        await openInEditor(schema, warnings);
      } catch {
        const fb = createEmptyForm(`${file.name} (변환 초안)`);
        fb.sections[0].questions.push({
          id: uid('q'),
          type: 'info',
          label: '자동 변환에 실패하여 원문을 그대로 담았습니다. 아래 내용을 참고해 문항을 직접 구성하세요.\n\n' + rawText.slice(0, 4000),
        });
        await openInEditor(fb, ['변환 결과 파싱 실패 → 원문 기반 빈 문진으로 폴백']);
      }
    } catch (e) {
      setError('변환 실패: ' + (e as Error).message);
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  // JSON 임포트 (웹/데스크톱 공통)
  const handleImport = async () => {
    setError('');
    try {
      const { schema, warnings } = parseLlmSchemaText(text);
      await openInEditor(schema, warnings);
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
          자동 변환 결과는 항상 <b>임시저장</b> 상태입니다. 반드시 에디터에서 검수·수정하세요. 모든 변환은{' '}
          <b>로컬(오픈소스)</b>에서 처리되며 외부 API를 호출하지 않습니다. <b>HWP/HWPX</b>는 후속
          단계에서 추가됩니다.
        </Alert>

        {/* 1-A. PDF → 원본 배경 + 입력필드 오버레이 (웹/데스크톱 공통) */}
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <PictureAsPdfIcon color="error" />
            <Typography variant="subtitle1" fontWeight={700}>
              PDF 문진 변환 (원본 그대로 + 입력필드)
            </Typography>
            <Chip size="small" label="권장" color="success" />
          </Stack>
          <Typography variant="body2" color="text.secondary" mb={2}>
            원본 PDF를 <b>그대로 배경으로</b> 보여주고, 체크박스(□○)·빈칸을 감지해 그 위에 입력필드를
            자동으로 얹습니다. 결과가 원본 PDF와 시각적으로 동일하며, 표·레이아웃이 그대로 유지됩니다.
            자동 배치가 완벽하지 않으면 에디터에서 필드를 드래그해 조정하세요.
          </Typography>
          <Button
            component="label"
            variant="contained"
            color="error"
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfIcon />}
            disabled={busy}
          >
            {busy ? '변환 중…' : 'PDF 파일 선택'}
            <input
              hidden
              type="file"
              accept=".pdf"
              onChange={(e) => e.target.files?.[0] && handlePdf(e.target.files[0])}
            />
          </Button>
          <Collapse in={!!progress}>
            <Alert severity="info" icon={<CircularProgress size={18} />} sx={{ mt: 2 }}>
              {progress}
            </Alert>
          </Collapse>
        </Paper>

        {/* 1-B. DOCX → 규칙 기반 텍스트 변환 (데스크톱 전용) */}
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <DescriptionIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={700}>
              DOCX 텍스트 변환
            </Typography>
            <Chip
              size="small"
              label={isElectron ? '데스크톱 앱' : '데스크톱 앱 전용'}
              color={isElectron ? 'success' : 'default'}
            />
          </Stack>
          {!isElectron ? (
            <Alert severity="warning" sx={{ mt: 1 }}>
              DOCX 변환은 <b>SmartQnR 데스크톱(.exe) 앱</b>에서만 동작합니다. (PDF 변환은 웹에서도 가능)
            </Alert>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" mb={2}>
                DOCX의 텍스트를 규칙 기반으로 문항·선택지로 추론합니다. 표 중심 양식은 정확도가 낮을 수
                있어, 복잡한 양식은 PDF로 저장 후 위의 PDF 변환을 권장합니다.
              </Typography>
              <Button
                component="label"
                variant="outlined"
                startIcon={busy ? <CircularProgress size={16} /> : <UploadFileIcon />}
                disabled={busy}
              >
                DOCX 파일 선택
                <input
                  hidden
                  type="file"
                  accept=".docx"
                  onChange={(e) => e.target.files?.[0] && handleDocx(e.target.files[0])}
                />
              </Button>
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
