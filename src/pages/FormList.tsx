// QNR001 문진 목록
import { useEffect, useMemo, useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import ApiIcon from '@mui/icons-material/Api';
import StorageIcon from '@mui/icons-material/Storage';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import LinkIcon from '@mui/icons-material/Link';
import { useFormsStore } from '@/store/useFormsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useCategoriesStore } from '@/store/useCategoriesStore';
import { CATEGORY_SEP, splitCategory } from '@/store/useCategoriesStore';
import { SAMPLE_FORM } from '@/data/sampleForm';
import { APP_VERSION } from '@/version';
import { FormSchema } from '@/types/schema';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import CategoryManager from '@/components/editor/CategoryManager';
import PreviewDialog from '@/components/editor/PreviewDialog';
import PatientLinkDialog from '@/components/PatientLinkDialog';
import ExcelImportDialog from '@/components/ExcelImportDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import CreateFormDialog from '@/components/CreateFormDialog';
import ThemeSettingsButton from '@/components/ThemeSettingsButton';
import { useMenuConfig } from '@/store/useMenuConfig';

const ALL = '__all__';
const NONE = '__none__';

const STATUS_LABEL: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'success' | 'warning' }
> = {
  draft: { label: '임시저장', color: 'default' },
  published: { label: '확정', color: 'primary' }, // 테마 강조색을 따름
  archived: { label: '보관됨', color: 'warning' },
};

// 드롭다운 섹션 라벨
function MenuSection({ label }: { label: string }) {
  return (
    <Typography
      sx={{
        px: 1.75,
        pt: 1.25,
        pb: 0.5,
        fontSize: 10.5,
        fontWeight: 800,
        color: 'text.disabled',
        letterSpacing: '0.08em',
      }}
    >
      {label}
    </Typography>
  );
}

// 아이콘 칩 + 제목·설명 메뉴 항목
function ActionItem({
  icon,
  chipColor,
  chipBg,
  title,
  desc,
  onClick,
  trailing,
  dimmed,
}: {
  icon: React.ReactNode;
  chipColor: string;
  chipBg: string;
  title: string;
  desc?: string;
  onClick: () => void;
  trailing?: React.ReactNode;
  dimmed?: boolean;
}) {
  return (
    <MenuItem
      onClick={onClick}
      sx={{
        borderRadius: 2,
        py: 0.9,
        px: 1,
        mx: 0.5,
        gap: 1.25,
        '& .ai-body, & .ai-chip': { opacity: dimmed ? 0.45 : 1 },
      }}
    >
      <Box
        className="ai-chip"
        sx={{
          width: 34,
          height: 34,
          borderRadius: 2,
          bgcolor: chipBg,
          color: chipColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box className="ai-body" sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1.25 }}>{title}</Typography>
        {desc && (
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary', lineHeight: 1.3 }}>
            {desc}
          </Typography>
        )}
      </Box>
      {trailing}
    </MenuItem>
  );
}

export default function FormList() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { forms, saveForm, deleteForm, refreshForms } = useFormsStore();
  const logout = useAuthStore((s) => s.logout);
  const permissions = useAuthStore((s) => s.permissions);
  const currentUser = useAuthStore((s) => s.currentUser);
  const displayName = useAuthStore((s) => s.displayName);
  const department = useAuthStore((s) => s.department);
  const canEdit = !!permissions?.edit;
  const canDelete = !!permissions?.delete;
  const canManage = !!permissions?.manageAccounts;
  const canView = permissions?.view !== false; // 조회 권한(기본 허용)
  const [previewForm, setPreviewForm] = useState<FormSchema | null>(null);
  const managedCategories = useCategoriesStore((s) => s.categories);
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [manageOpen, setManageOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const responsesAll = useFormsStore((s) => s.responses);
  const [sortKey, setSortKey] = useState<'recent' | 'created' | 'title'>('recent');
  const [sortAnchor, setSortAnchor] = useState<null | HTMLElement>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;
  const SORT_LABEL: Record<'recent' | 'created' | 'title', string> = {
    recent: '최근 수정순',
    created: '최근 등록순',
    title: '이름순',
  };

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
          (catFilter === NONE
            ? !f.category
            : // 대분류를 고르면 그 하위(경로) 문진까지 포함
              f.category === catFilter || f.category?.startsWith(catFilter + CATEGORY_SEP));
        const matchStatus =
          statusFilter === 'all' ||
          (statusFilter === 'published' ? f.status === 'published' : f.status !== 'published');
        return matchQ && matchCat && matchStatus;
      }),
    [forms, query, catFilter, statusFilter],
  );

  // 사이드 필터 건수(상태·분류별)
  const counts = useMemo(() => {
    const published = forms.filter((f) => f.status === 'published').length;
    const byCat: Record<string, number> = {};
    forms.forEach((f) => {
      const k = f.category ?? NONE;
      byCat[k] = (byCat[k] ?? 0) + 1;
    });
    return { total: forms.length, published, draft: forms.length - published, byCat };
  }, [forms]);

  // 분류 건수 — 대분류는 하위(경로) 문진까지 합산
  const catCount = (c: string) =>
    forms.filter((f) => f.category === c || f.category?.startsWith(c + CATEGORY_SEP)).length;

  // 문진별 응답 수
  const respCount = useMemo(() => {
    const m: Record<string, number> = {};
    responsesAll.forEach((r) => {
      m[r.formId] = (m[r.formId] ?? 0) + 1;
    });
    return m;
  }, [responsesAll]);

  // 정렬 적용
  const sorted = useMemo(() => {
    const arr = filtered.slice();
    if (sortKey === 'title') arr.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
    else if (sortKey === 'created')
      arr.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    else arr.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
    return arr;
  }, [filtered, sortKey]);

  // 페이징(페이지당 15개) — 필터·정렬 변경 시 1페이지로, 개수 변화 시 현재 페이지 보정
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  useEffect(() => {
    setPage(1);
  }, [query, catFilter, statusFilter, sortKey]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);
  const paged = useMemo(
    () => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sorted, page],
  );

  // 선택(체크박스) — 헤더 전체선택은 현재 페이지 기준
  const allSelected = paged.length > 0 && paged.every((f) => selected.has(f.id));
  const toggleSel = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleAll = () =>
    setSelected((s) => {
      const n = new Set(s);
      if (allSelected) paged.forEach((f) => n.delete(f.id));
      else paged.forEach((f) => n.add(f.id));
      return n;
    });
  const bulkDelete = () => {
    selected.forEach((id) => void deleteForm(id).catch(() => {}));
    setSelected(new Set());
  };

  const seedSample = () => {
    void saveForm({ ...SAMPLE_FORM, id: `${SAMPLE_FORM.id}_${Date.now().toString(36)}` }).catch(
      () => {},
    );
  };

  // 메뉴 항목 사용여부(관리자 설정 → 사용자 메뉴 반영)
  const menuEnabled = useMenuConfig((s) => s.enabled);
  const isMenuEnabled = (key: string) => menuEnabled[key] !== false;

  interface Action {
    key: string;
    section: '만들기' | '환자' | '관리';
    title: string;
    desc: string;
    icon: JSX.Element;
    chipColor: string;
    chipBg: string;
    allowed: boolean;
    /** 관리자가 사용자 노출 여부를 켜고 끌 수 있는 항목(관리 전용 항목은 false) */
    userConfigurable?: boolean;
    run: () => void;
  }
  const actions: Action[] = [
    {
      key: 'new',
      section: '만들기',
      title: '새 문진',
      desc: '빈 문진 새로 작성',
      icon: <AddIcon fontSize="small" />,
      chipColor: theme.palette.primary.dark,
      chipBg: alpha(theme.palette.primary.main, 0.14),
      allowed: canEdit,
      userConfigurable: true,
      run: () => setCreateOpen(true),
    },
    {
      key: 'excel',
      section: '만들기',
      title: '엑셀로 만들기',
      desc: '템플릿 업로드',
      icon: <TableChartOutlinedIcon fontSize="small" />,
      chipColor: '#1f9d57',
      chipBg: '#e6f6ec',
      allowed: canEdit,
      userConfigurable: true,
      run: () => setExcelOpen(true),
    },
    {
      key: 'link',
      section: '환자',
      title: '환자 링크',
      desc: '문진 링크 생성',
      icon: <LinkIcon fontSize="small" />,
      chipColor: '#167c50',
      chipBg: '#e2f2ea',
      allowed: true,
      userConfigurable: true,
      run: () => setLinkOpen(true),
    },
    {
      key: 'patient',
      section: '환자',
      title: '환자 화면',
      desc: '문진 입력 화면 열기',
      icon: <AssignmentIndIcon fontSize="small" />,
      chipColor: '#3f76d0',
      chipBg: '#e8f0fe',
      allowed: true,
      userConfigurable: true,
      run: () => window.open('#/patient/login', '_blank'),
    },
    {
      key: 'accounts',
      section: '관리',
      title: '계정 관리',
      desc: '계정·권한',
      icon: <ManageAccountsIcon fontSize="small" />,
      chipColor: '#5b6b7d',
      chipBg: '#eef1f5',
      allowed: canManage,
      run: () => navigate('/accounts'),
    },
    {
      key: 'api',
      section: '관리',
      title: 'API 연동',
      desc: 'EMR 연동 설정',
      icon: <ApiIcon fontSize="small" />,
      chipColor: '#3f76d0',
      chipBg: '#e8f0fe',
      allowed: canManage,
      run: () => navigate('/integration'),
    },
    {
      key: 'dblink',
      section: '관리',
      title: 'DB 쿼리 연동',
      desc: 'DB 직접 조회·매핑',
      icon: <StorageIcon fontSize="small" />,
      chipColor: '#8a5a12',
      chipBg: '#faf1dc',
      allowed: canManage,
      run: () => navigate('/db-link'),
    },
    {
      key: 'stats',
      section: '관리',
      title: '통계',
      desc: '응답 통계 대시보드',
      icon: <QueryStatsIcon fontSize="small" />,
      chipColor: theme.palette.primary.dark,
      chipBg: alpha(theme.palette.primary.main, 0.14),
      allowed: true,
      userConfigurable: true,
      run: () => navigate('/stats'),
    },
    {
      key: 'logs',
      section: '관리',
      title: '로그 보기',
      desc: '화면·서버 로그',
      icon: <ArticleOutlinedIcon fontSize="small" />,
      chipColor: '#5b6b7d',
      chipBg: '#eef1f5',
      allowed: canManage,
      run: () => navigate('/logs'),
    },
  ];
  // 관리자는 모든 허용 항목을 보고, 일반 사용자는 관리자가 켠(사용) 항목만 본다.
  const available = actions.filter(
    (a) => a.allowed && (canManage || !a.userConfigurable || isMenuEnabled(a.key)),
  );
  const SECTIONS: Action['section'][] = ['만들기', '환자', '관리'];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* ─────────── 좌측 사이드바 ─────────── */}
      <Box
        component="aside"
        sx={{
          width: 250,
          flexShrink: 0,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        {/* 브랜드 */}
        <Box sx={{ px: 2, pt: 2.25, pb: 1.75, display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2.5,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 20,
              boxShadow: (t) => `0 6px 16px -6px ${alpha(t.palette.primary.main, 0.7)}`,
            }}
          >
            Q
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 15.5, fontWeight: 800, lineHeight: 1.15 }}>
              SmartQnR
            </Typography>
            <Typography noWrap sx={{ fontSize: 11, color: 'text.secondary' }}>
              문진 관리
            </Typography>
          </Box>
        </Box>
        <Divider />

        {/* 메뉴 (만들기 · 환자 · 관리) — 관리 항목은 권한 있는 사용자만 노출 */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            px: 0.75,
            py: 1,
            scrollbarWidth: 'thin',
            scrollbarColor: (t) => `${alpha(t.palette.text.primary, 0.18)} transparent`,
            '&::-webkit-scrollbar': { width: 8 },
            '&::-webkit-scrollbar-thumb': {
              borderRadius: 8,
              border: '2px solid transparent',
              backgroundClip: 'padding-box',
              backgroundColor: (t) => alpha(t.palette.text.primary, 0.18),
            },
          }}
        >
          {SECTIONS.map((section) => {
            const items = available.filter((a) => a.section === section);
            if (items.length === 0) return null;
            return (
              <Box key={section}>
                <MenuSection label={section} />
                {items.map((a) => (
                  <ActionItem
                    key={a.key}
                    icon={a.icon}
                    chipColor={a.chipColor}
                    chipBg={a.chipBg}
                    title={a.title}
                    desc={a.desc}
                    onClick={() => a.run()}
                  />
                ))}
              </Box>
            );
          })}
        </Box>
        <Divider />

        {/* 사용자 */}
        <Box sx={{ px: 1.5, py: 1.25, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bgcolor: (t) => alpha(t.palette.primary.main, 0.15),
              color: 'primary.dark',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            {(displayName ?? currentUser ?? 'A').slice(0, 1).toUpperCase()}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography noWrap sx={{ fontSize: 13, fontWeight: 700 }}>
              {displayName ?? currentUser ?? 'admin'}
            </Typography>
            <Typography noWrap sx={{ fontSize: 11, color: 'text.secondary' }}>
              {department || '관리자'}
            </Typography>
          </Box>
          <ThemeSettingsButton />
          <Tooltip title="로그아웃">
            <IconButton size="small" onClick={() => setLogoutOpen(true)}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ─────────── 본문 ─────────── */}
      <Box component="main" sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* 헤더 */}
        <Box
          sx={{
            px: { xs: 2, md: 4 },
            pt: 3,
            pb: 2,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              문진
            </Typography>
            <Typography variant="body2" color="text.secondary">
              등록된 문진 {forms.length}개 · 확정 {counts.published} · 임시저장 {counts.draft}
            </Typography>
          </Box>
        </Box>

        {/* 툴바(조회 조건): 검색 · 상태 · 분류 · 정렬 */}
        <Box
          sx={{
            px: { xs: 2, md: 4 },
            pb: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            flexWrap: 'wrap',
          }}
        >
          <TextField
            size="small"
            placeholder="문진지 제목 · ID 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ flex: '1 1 240px', minWidth: 220, maxWidth: 380 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Stack direction="row" spacing={0.75}>
            <Chip
              label="전체"
              size="small"
              onClick={() => setStatusFilter('all')}
              color={statusFilter === 'all' ? 'primary' : 'default'}
              variant={statusFilter === 'all' ? 'filled' : 'outlined'}
              sx={{ fontWeight: 700 }}
            />
            <Chip
              label="확정"
              size="small"
              onClick={() => setStatusFilter('published')}
              color={statusFilter === 'published' ? 'primary' : 'default'}
              variant={statusFilter === 'published' ? 'filled' : 'outlined'}
              sx={{ fontWeight: 700 }}
            />
            <Chip
              label="임시저장"
              size="small"
              onClick={() => setStatusFilter('draft')}
              color={statusFilter === 'draft' ? 'primary' : 'default'}
              variant={statusFilter === 'draft' ? 'filled' : 'outlined'}
              sx={{ fontWeight: 700 }}
            />
          </Stack>
          <Box sx={{ width: { xs: '100%', sm: 220 }, flexShrink: 0 }}>
            <TextField
              select
              size="small"
              fullWidth
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LabelOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'background.paper' },
              }}
              SelectProps={{
                MenuProps: {
                  PaperProps: {
                    sx: {
                      mt: 0.5,
                      borderRadius: 2.5,
                      maxHeight: 320,
                      boxShadow: '0 10px 30px -12px rgba(15,40,30,.4)',
                      border: '1px solid',
                      borderColor: 'divider',
                      scrollbarWidth: 'thin',
                      scrollbarColor: (t) => `${alpha(t.palette.text.primary, 0.18)} transparent`,
                      '&::-webkit-scrollbar': { width: 8 },
                      '&::-webkit-scrollbar-track': { background: 'transparent', margin: 4 },
                      '&::-webkit-scrollbar-thumb': {
                        borderRadius: 8,
                        border: '2px solid transparent',
                        backgroundClip: 'padding-box',
                        backgroundColor: (t) => alpha(t.palette.text.primary, 0.18),
                      },
                      '&::-webkit-scrollbar-thumb:hover': {
                        backgroundColor: (t) => alpha(t.palette.text.primary, 0.32),
                      },
                      '& .MuiList-root': { py: 0.5 },
                      '& .MuiMenuItem-root': { borderRadius: 1.5, mx: 0.5, minHeight: 38 },
                    },
                  },
                },
                renderValue: (val) => {
                  const v = val as string;
                  const label = v === ALL ? '전체' : v === NONE ? '분류 없음' : v;
                  const n =
                    v === ALL ? counts.total : v === NONE ? (counts.byCat[NONE] ?? 0) : catCount(v);
                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 700, minWidth: 0 }}>
                        {label}
                      </Typography>
                      <Box
                        component="span"
                        sx={{
                          ml: 'auto',
                          flexShrink: 0,
                          fontSize: 11,
                          fontWeight: 800,
                          fontVariantNumeric: 'tabular-nums',
                          color: 'text.secondary',
                          bgcolor: 'action.hover',
                          px: 0.75,
                          borderRadius: 1,
                        }}
                      >
                        {n}
                      </Box>
                    </Box>
                  );
                },
              }}
            >
              {[
                <MenuItem key={ALL} value={ALL} sx={{ display: 'flex', gap: 1, fontWeight: 700 }}>
                  <span>전체</span>
                  <Box
                    component="span"
                    sx={{
                      ml: 'auto',
                      fontSize: 11.5,
                      color: 'text.secondary',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {counts.total}
                  </Box>
                </MenuItem>,
                ...(() => {
                  // 대분류 → 하위 순서, 하위는 점 마커 + 들여쓰기
                  const parents = Array.from(
                    new Set(filterCategories.map((c) => c.split(CATEGORY_SEP)[0])),
                  );
                  const els: JSX.Element[] = [];
                  parents.forEach((p) => {
                    els.push(
                      <MenuItem key={p} value={p} sx={{ display: 'flex', gap: 1, fontWeight: 700 }}>
                        <span>{p}</span>
                        <Box
                          component="span"
                          sx={{
                            ml: 'auto',
                            fontSize: 11.5,
                            color: 'text.secondary',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {catCount(p)}
                        </Box>
                      </MenuItem>,
                    );
                    filterCategories
                      .filter((c) => c.startsWith(p + CATEGORY_SEP))
                      .forEach((c) => {
                        const child = c.slice((p + CATEGORY_SEP).length);
                        els.push(
                          <MenuItem
                            key={c}
                            value={c}
                            sx={{
                              display: 'flex',
                              gap: 1,
                              pl: 2,
                              fontSize: 13,
                              color: 'text.secondary',
                            }}
                          >
                            <Box
                              component="span"
                              sx={{
                                width: 5,
                                height: 5,
                                borderRadius: '50%',
                                bgcolor: 'divider',
                                flexShrink: 0,
                              }}
                            />
                            <span>{child}</span>
                            <Box
                              component="span"
                              sx={{
                                ml: 'auto',
                                fontSize: 11.5,
                                color: 'text.secondary',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {catCount(c)}
                            </Box>
                          </MenuItem>,
                        );
                      });
                  });
                  return els;
                })(),
                ...(hasUncategorized
                  ? [
                      <MenuItem key={NONE} value={NONE} sx={{ display: 'flex', gap: 1 }}>
                        <span>분류 없음</span>
                        <Box
                          component="span"
                          sx={{
                            ml: 'auto',
                            fontSize: 11.5,
                            color: 'text.secondary',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {counts.byCat[NONE] ?? 0}
                        </Box>
                      </MenuItem>,
                    ]
                  : []),
              ]}
            </TextField>
          </Box>
          <Tooltip title="분류 관리">
            <IconButton
              onClick={() => setManageOpen(true)}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
            >
              <LabelOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            variant="text"
            startIcon={<SwapVertIcon />}
            onClick={(e) => setSortAnchor(e.currentTarget)}
            sx={{ ml: 'auto', color: 'text.secondary', fontWeight: 700 }}
          >
            {SORT_LABEL[sortKey]}
          </Button>
        </Box>

        {/* 선택 바 */}
        {selected.size > 0 && (
          <Box
            sx={{
              mx: { xs: 2, md: 4 },
              mb: 1.5,
              px: 2,
              py: 1,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
              border: '1px solid',
              borderColor: (t) => alpha(t.palette.primary.main, 0.35),
            }}
          >
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'primary.dark' }}>
              {selected.size}개 선택됨
            </Typography>
            <Button size="small" variant="text" onClick={() => setSelected(new Set())}>
              선택 해제
            </Button>
            {canDelete && (
              <Button
                size="small"
                variant="text"
                color="error"
                startIcon={<DeleteOutlineIcon />}
                onClick={bulkDelete}
                sx={{ ml: 'auto', fontWeight: 700 }}
              >
                삭제
              </Button>
            )}
          </Box>
        )}

        {/* 테이블 */}
        <Box sx={{ px: { xs: 2, md: 4 }, pb: 4, flex: 1 }}>
          {sorted.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
              <Typography color="text.secondary" sx={{ mb: forms.length === 0 && canEdit ? 2 : 0 }}>
                {forms.length === 0 ? '등록된 문진이 없습니다.' : '조건에 맞는 문진이 없습니다.'}
              </Typography>
              {forms.length === 0 && canEdit && (
                <Stack direction="row" spacing={1} justifyContent="center">
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateOpen(true)}
                  >
                    새 문진 만들기
                  </Button>
                  <Button variant="text" onClick={seedSample}>
                    샘플(마취 문진표) 불러오기
                  </Button>
                </Stack>
              )}
            </Paper>
          ) : (
            <Paper variant="outlined" sx={{ borderRadius: 3, overflowX: 'auto' }}>
              <Box sx={{ minWidth: 900 }}>
                {/* 헤더 행 */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '34px minmax(0,1fr) 176px 92px 140px 124px 150px',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 2,
                    py: 1.25,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'action.hover',
                    '& .col': {
                      fontSize: 11.5,
                      fontWeight: 800,
                      letterSpacing: '0.03em',
                      color: 'text.secondary',
                    },
                  }}
                >
                  <Checkbox
                    size="small"
                    checked={allSelected}
                    indeterminate={selected.size > 0 && !allSelected}
                    onChange={toggleAll}
                    sx={{ p: 0 }}
                  />
                  <Typography className="col">문진명</Typography>
                  <Typography className="col">분류</Typography>
                  <Typography className="col">상태</Typography>
                  <Typography className="col">문항 · 버전</Typography>
                  <Typography className="col">등록 · 수정</Typography>
                  <Typography className="col">관리</Typography>
                </Box>

                {/* 데이터 행 */}
                {paged.map((f) => {
                  const qCount = f.sections.reduce((a, s) => a + s.questions.length, 0);
                  const st = STATUS_LABEL[f.status] ?? STATUS_LABEL.draft;
                  const sel = selected.has(f.id);
                  const cat = f.category ? splitCategory(f.category) : null;
                  return (
                    <Box
                      key={f.id}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '34px minmax(0,1fr) 176px 92px 140px 124px 150px',
                        alignItems: 'center',
                        gap: 1.5,
                        px: 2,
                        py: 1.25,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '&:last-of-type': { borderBottom: 'none' },
                        bgcolor: sel ? (t) => alpha(t.palette.primary.main, 0.06) : 'transparent',
                        transition: 'background-color .12s',
                        '&:hover': {
                          bgcolor: sel ? (t) => alpha(t.palette.primary.main, 0.1) : 'action.hover',
                        },
                      }}
                    >
                      <Checkbox
                        size="small"
                        checked={sel}
                        onChange={() => toggleSel(f.id)}
                        sx={{ p: 0 }}
                      />
                      <Box
                        sx={{ minWidth: 0, cursor: canView ? 'pointer' : 'default' }}
                        onClick={() => canView && setPreviewForm(f)}
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={0.75}
                          sx={{ minWidth: 0 }}
                        >
                          <Typography noWrap sx={{ fontWeight: 700, fontSize: 14 }}>
                            {f.title}
                          </Typography>
                          {f.status !== 'published' && (
                            <Chip
                              label="편집 중"
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: 10.5,
                                fontWeight: 700,
                                bgcolor: (t) => alpha(t.palette.warning.main, 0.16),
                                color: 'warning.dark',
                                flexShrink: 0,
                              }}
                            />
                          )}
                        </Stack>
                        {respCount[f.id] ? (
                          <Typography noWrap sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                            응답 {respCount[f.id]}
                          </Typography>
                        ) : null}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        {cat ? (
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                              minWidth: 0,
                            }}
                          >
                            <Typography noWrap sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                              {cat.parent}
                            </Typography>
                            {cat.child && (
                              <>
                                <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>
                                  ›
                                </Typography>
                                <Typography
                                  noWrap
                                  sx={{ fontSize: 12.5, fontWeight: 700, color: 'primary.dark' }}
                                >
                                  {cat.child}
                                </Typography>
                              </>
                            )}
                          </Box>
                        ) : (
                          <Typography sx={{ fontSize: 12.5, color: 'text.disabled' }}>—</Typography>
                        )}
                      </Box>
                      <Box>
                        <Chip label={st.label} color={st.color} size="small" />
                      </Box>
                      <Typography
                        sx={{
                          fontSize: 12.5,
                          color: 'text.secondary',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        문항 {qCount} · v{f.version}
                      </Typography>
                      <Box sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                          등록{' '}
                          {f.createdAt ? new Date(f.createdAt).toLocaleDateString('ko-KR') : '-'}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                          수정{' '}
                          {f.updatedAt ? new Date(f.updatedAt).toLocaleDateString('ko-KR') : '-'}
                        </Typography>
                      </Box>
                      {/* 행 관리 — 아이콘 직접 클릭(내용 보기·편집·응답 화면·삭제) */}
                      <Stack
                        direction="row"
                        spacing={0.25}
                        justifyContent="flex-start"
                        sx={{ whiteSpace: 'nowrap' }}
                      >
                        {canEdit && (
                          <Tooltip title="편집">
                            <IconButton size="small" onClick={() => navigate(`/editor/${f.id}`)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip
                          title={f.status === 'published' ? '응답 화면 열기' : '확정 후 응답 가능'}
                        >
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
                        {canDelete && (
                          <Tooltip title="삭제">
                            <IconButton
                              size="small"
                              onClick={() => void deleteForm(f.id).catch(() => {})}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </Box>
                  );
                })}
              </Box>
            </Paper>
          )}

          {sorted.length > 0 && (
            <Box
              sx={{
                px: 0.5,
                pt: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
                flexWrap: 'wrap',
                color: 'text.secondary',
              }}
            >
              <Typography variant="caption">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} · 총{' '}
                {sorted.length}개{sorted.length !== forms.length ? ` (전체 ${forms.length}개)` : ''}
              </Typography>
              {pageCount > 1 && (
                <Pagination
                  count={pageCount}
                  page={page}
                  onChange={(_, p) => setPage(p)}
                  size="small"
                  color="primary"
                  shape="rounded"
                />
              )}
              <Typography variant="caption">v{APP_VERSION}</Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* 정렬 메뉴 */}
      <Menu
        anchorEl={sortAnchor}
        open={!!sortAnchor}
        onClose={() => setSortAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {(['recent', 'created', 'title'] as const).map((k) => (
          <MenuItem
            key={k}
            selected={sortKey === k}
            onClick={() => {
              setSortKey(k);
              setSortAnchor(null);
            }}
          >
            {SORT_LABEL[k]}
          </MenuItem>
        ))}
      </Menu>

      <CategoryManager open={manageOpen} onClose={() => setManageOpen(false)} />
      <PatientLinkDialog open={linkOpen} onClose={() => setLinkOpen(false)} />
      <ExcelImportDialog
        open={excelOpen}
        onClose={() => setExcelOpen(false)}
        onImport={(schema) => {
          void saveForm(schema).catch(() => {});
          setExcelOpen(false);
          navigate(`/editor/${schema.id}`);
        }}
      />
      {previewForm && (
        <PreviewDialog open schema={previewForm} onClose={() => setPreviewForm(null)} />
      )}
      <CreateFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onChoose={(mode) => {
          setCreateOpen(false);
          navigate(`/editor/new?mode=${mode}`);
        }}
      />
      <ConfirmDialog
        open={logoutOpen}
        title="로그아웃 하시겠습니까?"
        message="현재 계정에서 로그아웃하고 로그인 화면으로 돌아갑니다."
        icon={<LogoutRoundedIcon sx={{ fontSize: 32 }} />}
        confirmLabel="로그아웃"
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => {
          setLogoutOpen(false);
          logout();
          navigate('/login', { replace: true });
        }}
      />
    </Box>
  );
}
