// QNR001 문진 목록
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  InputAdornment,
  MenuItem,
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
import LogoutIcon from '@mui/icons-material/Logout';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import { useFormsStore } from '@/store/useFormsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useCategoriesStore } from '@/store/useCategoriesStore';
import { SAMPLE_FORM } from '@/data/sampleForm';
import { APP_VERSION } from '@/version';
import CategoryManager from '@/components/editor/CategoryManager';

const ALL = '__all__';
const NONE = '__none__';

const STATUS_LABEL: Record<string, { label: string; color: 'default' | 'success' | 'warning' }> = {
  draft: { label: '초안', color: 'default' },
  published: { label: '발행됨', color: 'success' },
  archived: { label: '보관됨', color: 'warning' },
};

export default function FormList() {
  const navigate = useNavigate();
  const { forms, saveForm, deleteForm, refreshForms } = useFormsStore();
  const logout = useAuthStore((s) => s.logout);
  const managedCategories = useCategoriesStore((s) => s.categories);
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<string>(ALL);
  const [manageOpen, setManageOpen] = useState(false);

  // 백엔드 연동 시 목록을 서버에서 불러옴(오프라인이면 no-op)
  useEffect(() => {
    refreshForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 필터에 노출할 분류: 관리 목록 + 실제 문진에 쓰인 값(합집합)
  const filterCategories = useMemo(() => {
    const set = new Set<string>(managedCategories);
    forms.forEach((f) => f.category && set.add(f.category));
    return Array.from(set);
  }, [managedCategories, forms]);

  const hasUncategorized = useMemo(() => forms.some((f) => !f.category), [forms]);

  const filtered = useMemo(
    () =>
      forms.filter((f) => {
        const q = query.toLowerCase();
        const matchQ = f.title.toLowerCase().includes(q) || f.id.toLowerCase().includes(q);
        const matchCat =
          catFilter === ALL ||
          (catFilter === NONE ? !f.category : f.category === catFilter);
        return matchQ && matchCat;
      }),
    [forms, query, catFilter],
  );

  const seedSample = () => {
    void saveForm({ ...SAMPLE_FORM, id: `${SAMPLE_FORM.id}_${Date.now().toString(36)}` }).catch(
      () => {},
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flex: 1 }}>
            SmartQnR · 문진 관리
          </Typography>
          <Chip
            label={`v${APP_VERSION}`}
            size="small"
            variant="outlined"
            sx={{ mr: 1.5, color: 'inherit', borderColor: 'rgba(255,255,255,0.5)' }}
          />
          <Typography variant="caption" sx={{ opacity: 0.8, mr: 1 }}>
            admin
          </Typography>
          <Tooltip title="로그아웃">
            <IconButton
              color="inherit"
              size="small"
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
            >
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
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
              color="secondary"
              startIcon={<AssignmentIndIcon />}
              onClick={() => window.open('#/patient/login', '_blank')}
            >
              환자 화면
            </Button>
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

        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          <TextField
            size="small"
            placeholder="제목 또는 ID 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            select
            size="small"
            label="분류"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            sx={{ width: 180 }}
          >
            <MenuItem value={ALL}>전체 분류</MenuItem>
            {filterCategories.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
            {hasUncategorized && <MenuItem value={NONE}>분류 없음</MenuItem>}
          </TextField>
          <Button
            variant="outlined"
            startIcon={<LabelOutlinedIcon />}
            onClick={() => setManageOpen(true)}
          >
            분류 관리
          </Button>
        </Stack>

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
                  <TableCell width={130}>분류</TableCell>
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
                        {f.category ? (
                          <Chip
                            label={f.category}
                            size="small"
                            variant="outlined"
                            onClick={() => setCatFilter(f.category as string)}
                            sx={{ cursor: 'pointer' }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            —
                          </Typography>
                        )}
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
                          <IconButton
                            size="small"
                            onClick={() => void deleteForm(f.id).catch(() => {})}
                          >
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

      <CategoryManager open={manageOpen} onClose={() => setManageOpen(false)} />
    </Box>
  );
}
