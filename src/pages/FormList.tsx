// QNR001 문진 목록
import { useEffect, useMemo, useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import ApiIcon from '@mui/icons-material/Api';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import LinkIcon from '@mui/icons-material/Link';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import { useFormsStore } from '@/store/useFormsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useCategoriesStore } from '@/store/useCategoriesStore';
import { useUiPrefs } from '@/store/useUiPrefs';
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

// 트렌디 필 버튼 스타일
const PILL_SX = {
  borderRadius: 999,
  textTransform: 'none',
  fontWeight: 700,
  px: 2,
  height: 40,
} as const;
// 새 문진 등 주요 버튼 — 테마 강조색 그라데이션을 따름
const GRAD_PILL_SX: SxProps<Theme> = {
  ...PILL_SX,
  color: '#fff',
  background: (t) =>
    `linear-gradient(135deg, ${t.palette.primary.light}, ${t.palette.primary.dark})`,
  boxShadow: (t) => `0 8px 18px -8px ${alpha(t.palette.primary.dark, 0.7)}`,
  '&:hover': {
    background: (t) =>
      `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.primary.dark})`,
  },
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

// 사이드 필터 항목(라벨 + 건수 + 선택 강조 + 상태 점)
function SideItem({
  label,
  count,
  active,
  onClick,
  dot,
  depth = 0,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  dot?: string;
  /** 0=대분류, 1=하위(들여쓰기 + 연결선 표시) */
  depth?: number;
}) {
  const isChild = depth > 0;
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        pr: 1,
        pl: 1.25,
        ml: isChild ? 1.5 : 0, // 하위 들여쓰기
        py: 0.7,
        borderRadius: 2,
        cursor: 'pointer',
        // 하위는 좌측 연결선으로 뎁스 표시(선택 시 브랜드색)
        borderLeft: isChild ? '2px solid' : '2px solid transparent',
        borderLeftColor: isChild ? (active ? 'primary.dark' : 'divider') : 'transparent',
        // 선택 상태를 브랜드색 채움으로 확실히 구분
        bgcolor: active ? 'primary.main' : 'transparent',
        color: active ? 'primary.contrastText' : 'inherit',
        boxShadow: active
          ? (t) => `0 6px 14px -6px ${alpha(t.palette.primary.main, 0.55)}`
          : 'none',
        '&:hover': { bgcolor: active ? 'primary.dark' : 'action.hover' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        {dot && (
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: active ? 'primary.contrastText' : dot,
              flexShrink: 0,
            }}
          />
        )}
        <Typography
          noWrap
          sx={{
            fontSize: isChild ? 12.5 : 13.5,
            fontWeight: active ? 700 : isChild ? 400 : 600,
            color: active ? 'primary.contrastText' : isChild ? 'text.secondary' : 'text.primary',
          }}
        >
          {label}
        </Typography>
      </Box>
      <Typography
        sx={{
          fontSize: 11.5,
          fontVariantNumeric: 'tabular-nums',
          color: active ? 'rgba(255,255,255,0.9)' : 'text.secondary',
        }}
      >
        {count}
      </Typography>
    </Box>
  );
}

// 사이드 섹션 라벨
function SideLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{
        px: 0.75,
        mt: 1.5,
        mb: 0.5,
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: '0.06em',
        color: 'text.disabled',
      }}
    >
      {children}
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
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const closeMenu = () => setMenuAnchor(null);

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

  const seedSample = () => {
    void saveForm({ ...SAMPLE_FORM, id: `${SAMPLE_FORM.id}_${Date.now().toString(36)}` }).catch(
      () => {},
    );
  };

  // 상단 메뉴/기본버튼 액션 정의
  const primaryKey = useUiPrefs((s) => s.primaryAction);
  const setPrimaryAction = useUiPrefs((s) => s.setPrimaryAction);

  // 더보기 메뉴 항목 사용여부(관리자 설정 → 사용자 메뉴 반영)
  const menuEnabled = useMenuConfig((s) => s.enabled);
  const toggleMenu = useMenuConfig((s) => s.toggle);
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
      key: 'convert',
      section: '만들기',
      title: '문서로 변환',
      desc: 'PDF·워드 불러오기',
      icon: <UploadFileIcon fontSize="small" />,
      chipColor: '#d98324',
      chipBg: '#fdf0e3',
      allowed: canEdit,
      userConfigurable: true,
      run: () => navigate('/upload'),
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
  // 앞에 고정할 기본 액션(권한 없으면 첫 번째로 폴백)
  const primary =
    available.find((a) => a.key === primaryKey) ??
    available.find((a) => a.key === 'new') ??
    available[0];
  const SECTIONS: Action['section'][] = ['만들기', '환자', '관리'];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="primary" elevation={0}>
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
          <Typography variant="caption" sx={{ opacity: 0.9, mr: 1 }}>
            {department ? `${department} · ` : ''}
            {displayName ?? currentUser ?? 'admin'}
          </Typography>
          <ThemeSettingsButton />
          <Tooltip title="로그아웃">
            <IconButton color="inherit" size="small" onClick={() => setLogoutOpen(true)}>
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
          <Stack direction="row" spacing={1} alignItems="center">
            {primary && (
              <Button
                disableElevation
                variant="contained"
                startIcon={primary.icon}
                onClick={primary.run}
                sx={GRAD_PILL_SX}
              >
                {primary.title}
              </Button>
            )}
            <Button
              variant="outlined"
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              sx={{
                ...PILL_SX,
                minWidth: 44,
                px: 1.5,
                borderColor: 'divider',
                color: 'text.primary',
              }}
            >
              <MoreHorizIcon />
            </Button>
          </Stack>

          <Menu
            anchorEl={menuAnchor}
            open={!!menuAnchor}
            onClose={closeMenu}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 288,
                borderRadius: 3,
                boxShadow: '0 20px 50px -16px rgba(15,30,46,.3)',
                py: 0.5,
              },
            }}
          >
            <Typography sx={{ px: 1.75, pt: 1, pb: 0.5, fontSize: 11, color: 'text.secondary' }}>
              📌 아이콘 = <b>앞에 고정</b>
              {canManage && (
                <>
                  {' '}
                  · 스위치 = <b>사용자 메뉴 표시 여부</b>
                </>
              )}
            </Typography>
            {SECTIONS.map((section) => {
              const items = available.filter((a) => a.section === section);
              if (items.length === 0) return null;
              return [
                <MenuSection key={`s-${section}`} label={section} />,
                ...items.map((a) => (
                  <ActionItem
                    key={a.key}
                    icon={a.icon}
                    chipColor={a.chipColor}
                    chipBg={a.chipBg}
                    title={a.title}
                    desc={a.desc}
                    onClick={() => {
                      closeMenu();
                      a.run();
                    }}
                    dimmed={canManage && a.userConfigurable && !isMenuEnabled(a.key)}
                    trailing={
                      <Stack direction="row" alignItems="center" spacing={0.25}>
                        {canManage && a.userConfigurable && (
                          <Tooltip
                            title={
                              isMenuEnabled(a.key)
                                ? '사용자에게 표시됨 (끄면 사용자 메뉴에서 숨김)'
                                : '사용자에게 숨김'
                            }
                          >
                            <Switch
                              size="small"
                              checked={isMenuEnabled(a.key)}
                              onClick={(e) => e.stopPropagation()}
                              onChange={() => toggleMenu(a.key)}
                            />
                          </Tooltip>
                        )}
                        <Tooltip
                          title={a.key === primaryKey ? '기본 화면(앞에 고정됨)' : '앞에 고정'}
                        >
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPrimaryAction(a.key);
                            }}
                            sx={{ ml: 0.25 }}
                          >
                            {a.key === primaryKey ? (
                              <PushPinIcon fontSize="small" sx={{ color: 'primary.main' }} />
                            ) : (
                              <PushPinOutlinedIcon
                                fontSize="small"
                                sx={{ color: 'text.disabled' }}
                              />
                            )}
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    }
                  />
                )),
              ];
            })}
          </Menu>
        </Stack>

        {forms.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
            <Typography color="text.secondary" mb={2}>
              등록된 문진이 없습니다.
            </Typography>
            {canEdit ? (
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
            ) : (
              <Typography variant="caption" color="text.disabled">
                문진 생성 권한이 없습니다.
              </Typography>
            )}
          </Paper>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '220px 1fr' },
              gap: 2.5,
              alignItems: 'start',
            }}
          >
            {/* 좌: 검색 + 상태·분류 필터 (상시 노출) */}
            <Paper
              variant="outlined"
              sx={{ p: 1.5, borderRadius: 3, position: { md: 'sticky' }, top: 88 }}
            >
              <TextField
                size="small"
                fullWidth
                placeholder="제목 · ID 검색"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />

              <SideLabel>상태</SideLabel>
              <SideItem
                label="전체"
                count={counts.total}
                active={statusFilter === 'all'}
                onClick={() => setStatusFilter('all')}
              />
              <SideItem
                label="확정"
                dot={theme.palette.primary.main}
                count={counts.published}
                active={statusFilter === 'published'}
                onClick={() => setStatusFilter('published')}
              />
              <SideItem
                label="임시저장"
                dot="#b7791f"
                count={counts.draft}
                active={statusFilter === 'draft'}
                onClick={() => setStatusFilter('draft')}
              />

              <SideLabel>분류</SideLabel>
              <SideItem
                label="전체"
                count={counts.total}
                active={catFilter === ALL}
                onClick={() => setCatFilter(ALL)}
              />
              {(() => {
                // 대분류 → 하위 순서로, 하위는 들여쓰기 표시
                const parents = Array.from(
                  new Set(filterCategories.map((c) => c.split(CATEGORY_SEP)[0])),
                );
                const items: JSX.Element[] = [];
                parents.forEach((p) => {
                  items.push(
                    <SideItem
                      key={p}
                      label={p}
                      count={catCount(p)}
                      active={catFilter === p}
                      onClick={() => setCatFilter(p)}
                    />,
                  );
                  filterCategories
                    .filter((c) => c.startsWith(p + CATEGORY_SEP))
                    .forEach((c) => {
                      const child = c.slice((p + CATEGORY_SEP).length);
                      items.push(
                        <SideItem
                          key={c}
                          label={child}
                          depth={1}
                          count={catCount(c)}
                          active={catFilter === c}
                          onClick={() => setCatFilter(c)}
                        />,
                      );
                    });
                });
                return items;
              })()}
              {hasUncategorized && (
                <SideItem
                  label="분류 없음"
                  count={counts.byCat[NONE] ?? 0}
                  active={catFilter === NONE}
                  onClick={() => setCatFilter(NONE)}
                />
              )}

              <Button
                variant="outlined"
                size="small"
                fullWidth
                startIcon={<LabelOutlinedIcon />}
                onClick={() => setManageOpen(true)}
                sx={{ mt: 1.5 }}
              >
                분류 관리
              </Button>
            </Paper>

            {/* 우: 문진 리스트(여유로운 행) */}
            {filtered.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 3 }}>
                <Typography color="text.secondary">조건에 맞는 문진이 없습니다.</Typography>
              </Paper>
            ) : (
              <Stack spacing={1.25}>
                {filtered.map((f) => {
                  const qCount = f.sections.reduce((a, s) => a + s.questions.length, 0);
                  const st = STATUS_LABEL[f.status] ?? STATUS_LABEL.draft;
                  return (
                    <Paper
                      key={f.id}
                      variant="outlined"
                      sx={{
                        p: 1.75,
                        borderRadius: 3,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        transition: 'box-shadow .15s, border-color .15s',
                        '&:hover': {
                          borderColor: 'divider',
                          boxShadow: '0 10px 26px -16px rgba(15,23,42,.35)',
                        },
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography fontWeight={700} noWrap>
                          {f.title}
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          flexWrap="wrap"
                          useFlexGap
                          sx={{ mt: 0.5 }}
                        >
                          {f.category
                            ? (() => {
                                const { parent, child } = splitCategory(f.category as string);
                                return (
                                  <Box
                                    onClick={() => setCatFilter(f.category as string)}
                                    sx={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 0.5,
                                      height: 24,
                                      pl: 1,
                                      pr: child ? 0.5 : 1,
                                      border: '1px solid',
                                      borderColor: 'divider',
                                      borderRadius: 999,
                                      cursor: 'pointer',
                                      bgcolor: 'background.paper',
                                      '&:hover': { borderColor: 'primary.main' },
                                    }}
                                  >
                                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                                      {parent}
                                    </Typography>
                                    {child && (
                                      <>
                                        <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>
                                          ›
                                        </Typography>
                                        <Box
                                          sx={{
                                            fontSize: 12,
                                            fontWeight: 700,
                                            color: 'primary.dark',
                                            bgcolor: 'action.hover',
                                            borderRadius: 999,
                                            px: 0.9,
                                            py: '1px',
                                          }}
                                        >
                                          {child}
                                        </Box>
                                      </>
                                    )}
                                  </Box>
                                );
                              })()
                            : null}
                          <Chip label={st.label} color={st.color} size="small" />
                          <Typography variant="caption" color="text.secondary">
                            문항 {qCount} · v{f.version}
                            {f.history && f.history.length ? ` · 이력 ${f.history.length}` : ''}
                          </Typography>
                        </Stack>
                      </Box>

                      <Box
                        sx={{
                          textAlign: 'right',
                          flexShrink: 0,
                          display: { xs: 'none', sm: 'block' },
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" display="block">
                          등록{' '}
                          {f.createdAt ? new Date(f.createdAt).toLocaleDateString('ko-KR') : '-'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          수정{' '}
                          {f.updatedAt ? new Date(f.updatedAt).toLocaleDateString('ko-KR') : '-'}
                        </Typography>
                      </Box>

                      <Box sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                        {canView && (
                          <Tooltip title="내용 보기">
                            <IconButton size="small" onClick={() => setPreviewForm(f)}>
                              <VisibilityOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
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
                      </Box>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Box>
        )}
      </Container>

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
