// 엑셀 템플릿 업로드로 문진 만들기 — 템플릿 다운로드 + .xlsx 파싱 → FormSchema
import { useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { FormSchema } from '@/types/schema';
import { parseExcelTemplate } from '@/utils/excelTemplate';

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (schema: FormSchema) => void;
}

const TEMPLATE_URL = `${import.meta.env.BASE_URL}templates/문진업로드템플릿.xlsx`;

export default function ExcelImportDialog({ open, onClose, onImport }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    schema: FormSchema;
    warnings: string[];
    questionCount: number;
    fileName: string;
  } | null>(null);

  const reset = () => {
    setError('');
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const downloadTemplate = async () => {
    try {
      const res = await fetch(TEMPLATE_URL);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '문진업로드템플릿.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('템플릿 다운로드에 실패했습니다.');
    }
  };

  const handleFile = async (file: File) => {
    setError('');
    setResult(null);
    try {
      const buf = await file.arrayBuffer();
      const parsed = parseExcelTemplate(buf, file.name);
      setResult({ ...parsed, fileName: file.name });
    } catch (e) {
      setError((e as Error).message || '파일을 읽을 수 없습니다.');
    }
  };

  const confirmImport = () => {
    if (!result) return;
    onImport(result.schema);
    reset();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>엑셀 템플릿으로 문진 만들기</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          제공된 엑셀 템플릿의 <b>‘문진질문’ 시트</b>에 문항을 입력한 뒤 업로드하면 문진이
          자동으로 만들어집니다. 열: 질문ID·섹션·순서·질문·응답유형·선택지·필수·표시조건·기타입력허용·비고.
        </Typography>

        {/* 1) 템플릿 받기 */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadTemplate}>
            템플릿 양식 다운로드
          </Button>
          <Typography variant="caption" color="text.secondary">
            처음이라면 양식을 먼저 받아 작성하세요. ‘작성가이드’ 시트 포함.
          </Typography>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* 2) 업로드 */}
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <Button
          variant="contained"
          startIcon={<UploadFileIcon />}
          onClick={() => inputRef.current?.click()}
        >
          작성한 엑셀 업로드
        </Button>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* 3) 결과 미리보기 */}
        {result && (
          <Box sx={{ mt: 2.5 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <CheckCircleIcon color="success" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={800}>
                불러오기 완료
              </Typography>
              <Chip size="small" label={`${result.questionCount}문항`} />
              <Chip
                size="small"
                variant="outlined"
                label={`${result.schema.sections.length}개 섹션`}
              />
            </Stack>

            <List dense sx={{ bgcolor: 'action.hover', borderRadius: 2, py: 0.5 }}>
              {result.schema.sections.map((s) => (
                <ListItem key={s.id} sx={{ py: 0.25 }}>
                  <DescriptionOutlinedIcon fontSize="small" sx={{ mr: 1, color: 'text.disabled' }} />
                  <ListItemText
                    primary={s.title}
                    secondary={`${s.questions.length}문항`}
                    primaryTypographyProps={{ fontWeight: 600, variant: 'body2' }}
                  />
                </ListItem>
              ))}
            </List>

            {result.warnings.length > 0 && (
              <Alert severity="warning" sx={{ mt: 1.5 }}>
                <Typography variant="caption" fontWeight={700}>
                  확인이 필요한 항목 {result.warnings.length}건
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                  {result.warnings.slice(0, 6).map((w, i) => (
                    <li key={i}>
                      <Typography variant="caption">{w}</Typography>
                    </li>
                  ))}
                </Box>
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>닫기</Button>
        <Button variant="contained" onClick={confirmImport} disabled={!result}>
          에디터에서 열기
        </Button>
      </DialogActions>
    </Dialog>
  );
}
