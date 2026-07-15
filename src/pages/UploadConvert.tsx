// QNR002 문서 업로드/변환
// 프론트 프로토타입 단계: 실제 문서 파싱·LLM 변환은 백엔드(Java) Phase 구현 대상.
// 현재는 (1) JSON 스키마 임포트, (2) 빈 문진 시작을 제공하고,
// §6.3 정규화 로직(schemaValidator)으로 안전하게 보정해 에디터로 넘긴다.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Box,
  Button,
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
import { useEditorStore } from '@/store/useEditorStore';
import { useFormsStore } from '@/store/useFormsStore';

export default function UploadConvert() {
  const navigate = useNavigate();
  const { loadForm } = useEditorStore();
  const { saveForm } = useFormsStore();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);

  const handleFile = async (file: File) => {
    const content = await file.text();
    setText(content);
    setError('');
  };

  const handleImport = () => {
    try {
      const { schema, warnings } = parseLlmSchemaText(text);
      setWarnings(warnings);
      saveForm(schema);
      loadForm(schema);
      navigate(`/editor/${schema.id}`);
    } catch (e) {
      setError('JSON 파싱에 실패했습니다. 형식을 확인하세요. ' + (e as Error).message);
    }
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
          실제 문서(PDF/DOCX/HWP) 파싱과 AI 자동 변환은 <b>백엔드(Java) 단계</b>에서 연결됩니다. 현재
          프론트 단계에서는 <b>변환 결과 JSON 임포트</b> 또는 <b>빈 문진</b>으로 에디터를 시작할 수
          있습니다. 자동 변환 결과는 항상 <b>초안</b>이며 반드시 검수·수정이 필요합니다.
        </Alert>

        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            변환 결과(JSON) 임포트
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            §3.1 문진 스키마 형식의 JSON을 붙여넣거나 파일로 업로드하세요. 코드펜스/설명이 섞여 있어도
            자동 정리하며, 알 수 없는 필드는 안전하게 보정합니다.
          </Typography>

          <Button component="label" variant="outlined" startIcon={<UploadFileIcon />} sx={{ mb: 2 }}>
            JSON 파일 선택
            <input
              hidden
              type="file"
              accept=".json,application/json,.txt"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </Button>

          <TextField
            multiline
            minRows={10}
            fullWidth
            placeholder='{ "title": "...", "sections": [ ... ] }'
            value={text}
            onChange={(e) => setText(e.target.value)}
            sx={{ fontFamily: 'monospace', mb: 2 }}
          />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {warnings.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              보정 사항: {warnings.join(' / ')}
            </Alert>
          )}

          <Button variant="contained" onClick={handleImport} disabled={!text.trim()}>
            임포트하여 편집
          </Button>
        </Paper>

        <Divider sx={{ my: 3 }}>또는</Divider>

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
