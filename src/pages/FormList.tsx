// QNR001 문진 목록
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useFormsStore } from '@/store/useFormsStore';
import { SAMPLE_FORM } from '@/data/sampleForm';

const STATUS_LABEL: Record<string, { label: string; color: 'default' | 'success' | 'warning' }> = {
  draft: { label: '초안', color: 'default' },
  published: { label: '발행됨', color: 'success' },
  archived: { label: '보관됨', color: 'warning' },
};

export default function FormList() {
  const navigate = useNavigate();
  const { forms, saveForm, deleteForm } = useFormsStore();
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () =>
      forms.filter(
        (f) =>
          f.title.toLowerCase().includes(query.toLowerCase()) ||
          f.id.toLowerCase().includes(query.toLowerCase()),
      ),
    [forms, query],
  );

  const seedSample = () => {
    saveForm({ ...SAMPLE_FORM, id: `${SAMPLE_FORM.id}_${Date.now().toString(36)}` });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flex: 1 }}>
            SmartQnR · 문진 관리
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            LHospital
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              문진 목록
            </Typography>
            <Typography variant="body2" color="text.secondary">
              총 {forms.length}개
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={() => navigate('/upload')}
            >
              문서로 변환
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/editor/new')}>
              새 문진
            </Button>
          </Stack>
        </Stack>

        <TextField
          size="small"
          placeholder="제목 또는 ID 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ mb: 2, width: 320 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        {forms.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
            <Typography color="text.secondary" mb={2}>
              등록된 문진이 없습니다.
            </Typography>
            <Stack direction="row" spacing={1} justifyContent="center">
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/editor/new')}>
                새 문진 만들기
              </Button>
              <Button variant="text" onClick={seedSample}>
                샘플(마취 문진표) 불러오기
              </Button>
            </Stack>
          </Paper>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>제목</TableCell>
                  <TableCell width={100}>상태</TableCell>
                  <TableCell width={80}>버전</TableCell>
                  <TableCell width={110}>문항 수</TableCell>
                  <TableCell width={160}>수정일</TableCell>
                  <TableCell width={160} align="right">
                    작업
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((f) => {
                  const qCount = f.sections.reduce((a, s) => a + s.questions.length, 0);
                  const st = STATUS_LABEL[f.status] ?? STATUS_LABEL.draft;
                  return (
                    <TableRow key={f.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {f.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {f.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={st.label} color={st.color} size="small" />
                      </TableCell>
                      <TableCell>v{f.version}</TableCell>
                      <TableCell>{qCount}</TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {f.updatedAt ? new Date(f.updatedAt).toLocaleString('ko-KR') : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="편집">
                          <IconButton size="small" onClick={() => navigate(`/editor/${f.id}`)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={f.status === 'published' ? '응답 화면 열기' : '발행 후 응답 가능'}>
                          <span>
                            <IconButton
                              size="small"
                              disabled={f.status !== 'published'}
                              onClick={() => navigate(`/respond/${f.id}`)}
                            >
                              <OpenInNewIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="삭제">
                          <IconButton size="small" onClick={() => deleteForm(f.id)}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>
    </Box>
  );
}
