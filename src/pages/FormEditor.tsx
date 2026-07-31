// QNR003 문진 에디터 페이지
import { Fragment, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AppBar,
  Autocomplete,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  FormControlLabel,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SaveIcon from '@mui/icons-material/Save';
import PublishIcon from '@mui/icons-material/Publish';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import ViewSidebarIcon from '@mui/icons-material/ViewSidebar';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import { isOverlayForm } from '@/types/schema';
import { useEditorStore } from '@/store/useEditorStore';
import { useFormsStore } from '@/store/useFormsStore';
import { useCategoriesStore } from '@/store/useCategoriesStore';
import EditorOutline from '@/components/editor/EditorOutline';
import OverlayEditor from '@/components/editor/OverlayEditor';
import QuestionEditPanel from '@/components/editor/QuestionEditPanel';
import ComponentPalette, { PALETTE_ITEMS } from '@/components/editor/ComponentPalette';
import TableEditor from '@/components/editor/TableEditor';
import FocusEditor from '@/components/editor/FocusEditor';
import PreviewDialog from '@/components/editor/PreviewDialog';
import PreviewWindow from '@/components/editor/PreviewWindow';
import FormRenderer from '@/components/renderer/FormRenderer';
import PreviewErrorBoundary from '@/components/PreviewErrorBoundary';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import CenterFocusStrongRoundedIcon from '@mui/icons-material/CenterFocusStrongRounded';
import ViewSidebarRoundedIcon from '@mui/icons-material/ViewSidebarRounded';

export default function FormEditor() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const {
    form,
    selected,
    loadForm,
    newForm,
    updateMeta,
    dirty,
    undo,
    redo,
    deleteSelected,
    nudgeSelected,
    copySelected,
    paste,
    addQuestion,
  } = useEditorStore();
  const canUndo = useEditorStore((s) => s._past.length > 0);
  const canRedo = useEditorStore((s) => s._future.length > 0);
  const activeSectionId = useEditorStore((s) => s.activeSectionId);
  const categories = useCategoriesStore((s) => s.categories);
  const addCategory = useCategoriesStore((s) => s.addCategory);
  const { getForm, saveForm, publishForm, fetchForm } = useFormsStore();
  const [preview, setPreview] = useState(false);
  // 미리보기를 별도 창(2모니터)으로 띄우는 중인지
  const [popoutPreview, setPopoutPreview] = useState(false);
  const [toast, setToast] = useState('');

  // 우측 실시간 미리보기 패널 표시 여부 (기본 표시) — 오버레이(PDF) 문진에는 없음
  const PREVIEW_KEY = 'smartqnr.editorSidePreview';
  const [sidePreview, setSidePreview] = useState<boolean>(() => {
    const v = localStorage.getItem(PREVIEW_KEY);
    return v === null ? true : v === '1';
  });
  const toggleSidePreview = () =>
    setSidePreview((v) => {
      localStorage.setItem(PREVIEW_KEY, v ? '0' : '1');
      return !v;
    });

  // 문진 메타(제목·설명·분류·테스트) 영역 접기/펼치기 — 상태 기억
  const META_KEY = 'smartqnr.editorMetaCollapsed';
  const [metaCollapsed, setMetaCollapsed] = useState<boolean>(
    () => localStorage.getItem(META_KEY) === '1',
  );
  const toggleMeta = () =>
    setMetaCollapsed((v) => {
      localStorage.setItem(META_KEY, v ? '0' : '1');
      return !v;
    });

  // 편집 방식(기본 3분할 / 표 / 집중) — 새 문진은 ?mode= 로 지정, 편집 중에도 전환 가능
  const location = useLocation();
  const [editMode, setEditMode] = useState<'sections' | 'table' | 'focus'>(() => {
    const m = new URLSearchParams(location.search).get('mode');
    return m === 'table' || m === 'focus' ? m : 'sections';
  });

  // 3영역(옵션/편집/미리보기) 순서 — 저장, 툴바에서 재배치 가능
  const ORDER_KEY = 'smartqnr.editorPanelOrder';
  const DEFAULT_ORDER = ['options', 'editor', 'preview'];
  const [panelOrder, setPanelOrder] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(ORDER_KEY);
      const arr = raw ? (JSON.parse(raw) as string[]) : null;
      if (arr && arr.length === 3 && DEFAULT_ORDER.every((k) => arr.includes(k))) return arr;
    } catch {
      /* 무시 */
    }
    return DEFAULT_ORDER;
  });
  const persistOrder = (o: string[]) => {
    setPanelOrder(o);
    try {
      localStorage.setItem(ORDER_KEY, JSON.stringify(o));
    } catch {
      /* 무시 */
    }
  };
  const movePanel = (key: string, dir: -1 | 1) => {
    const i = panelOrder.indexOf(key);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= panelOrder.length) return;
    const next = panelOrder.slice();
    [next[i], next[j]] = [next[j], next[i]];
    persistOrder(next);
  };
  const [layoutAnchor, setLayoutAnchor] = useState<null | HTMLElement>(null);

  // 각 영역 폭(가중치) — 인접 구분선 드래그로 조절, 저장
  const SIZES_KEY = 'smartqnr.editorPanelSizes';
  const DEFAULT_SIZES: Record<string, number> = { options: 30, editor: 42, preview: 28 };
  const [sizes, setSizes] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem(SIZES_KEY);
      const obj = raw ? (JSON.parse(raw) as Record<string, number>) : null;
      if (obj && typeof obj.options === 'number') return { ...DEFAULT_SIZES, ...obj };
    } catch {
      /* 무시 */
    }
    return DEFAULT_SIZES;
  });
  const sizesRef = useRef(sizes);
  sizesRef.current = sizes;

  const splitRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<null | {
    leftKey: string;
    rightKey: string;
    startX: number;
    startL: number;
    startR: number;
    pxPerWeight: number;
  }>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const deltaW = (e.clientX - d.startX) / d.pxPerWeight;
      const pair = d.startL + d.startR;
      const MIN = 12;
      const nl = Math.min(pair - MIN, Math.max(MIN, d.startL + deltaW));
      setSizes((s) => ({ ...s, [d.leftKey]: nl, [d.rightKey]: pair - nl }));
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      try {
        localStorage.setItem(SIZES_KEY, JSON.stringify(sizesRef.current));
      } catch {
        /* 무시 */
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const startDividerDrag =
    (leftKey: string, rightKey: string, visibleKeys: string[]) => (e: React.MouseEvent) => {
      e.preventDefault();
      const rect = splitRef.current?.getBoundingClientRect();
      if (!rect) return;
      const totalWeight = visibleKeys.reduce((a, k) => a + (sizes[k] ?? 1), 0);
      dragRef.current = {
        leftKey,
        rightKey,
        startX: e.clientX,
        startL: sizes[leftKey] ?? 1,
        startR: sizes[rightKey] ?? 1,
        pxPerWeight: rect.width / totalWeight,
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };

  const PANEL_LABEL: Record<string, string> = {
    options: '옵션',
    editor: '컴포넌트/섹션',
    preview: '미리보기',
  };

  // 진입 시 폼 로드 (백엔드 모드면 캐시에 없을 때 서버에서 단건 조회)
  useEffect(() => {
    let cancelled = false;
    if (formId && formId !== 'new') {
      const existing = getForm(formId);
      if (existing) {
        loadForm(existing);
      } else {
        fetchForm(formId).then((f) => {
          if (cancelled) return;
          if (f) loadForm(f);
          else navigate('/');
        });
      }
    } else {
      newForm();
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  // 키보드 단축키: Ctrl/⌘+Z 실행취소, Ctrl+Shift+Z·Ctrl+Y 다시실행, Delete 선택 삭제
  useEffect(() => {
    const isEditable = (el: EventTarget | null) => {
      const n = el as HTMLElement | null;
      if (!n) return false;
      const tag = n.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || n.isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        undo();
      } else if (
        mod &&
        ((e.shiftKey && (e.key === 'z' || e.key === 'Z')) || e.key === 'y' || e.key === 'Y')
      ) {
        e.preventDefault();
        redo();
      } else if (mod && (e.key === 'c' || e.key === 'C') && !isEditable(e.target)) {
        // 선택 컴포넌트 복사
        if (useEditorStore.getState().selectedIds.length > 0) {
          e.preventDefault();
          copySelected();
        }
      } else if (mod && (e.key === 'v' || e.key === 'V') && !isEditable(e.target)) {
        // 붙여넣기
        if (useEditorStore.getState()._clipboard.length > 0) {
          e.preventDefault();
          paste();
        }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditable(e.target)) {
        // 입력창에 포커스가 없을 때만 선택 컴포넌트 삭제
        if (useEditorStore.getState().selected) {
          e.preventDefault();
          deleteSelected();
        }
      } else if (e.key.startsWith('Arrow') && !isEditable(e.target)) {
        // 선택된 컴포넌트: 방향키=이동, Ctrl+방향키=미세 이동, Shift+방향키=크기 조절
        if (!useEditorStore.getState().selected) return;
        const dir =
          e.key === 'ArrowLeft'
            ? 'left'
            : e.key === 'ArrowRight'
              ? 'right'
              : e.key === 'ArrowUp'
                ? 'up'
                : 'down';
        const mode = e.shiftKey ? 'resize' : e.ctrlKey || e.metaKey ? 'fine' : 'move';
        e.preventDefault();
        nudgeSelected(dir, mode);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, deleteSelected, nudgeSelected, copySelected, paste]);

  // F1~F(N): 팔레트 순서대로 컴포넌트를 활성 섹션에 추가
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const m = /^F(\d{1,2})$/.exec(e.key);
      if (!m) return;
      const idx = Number(m[1]) - 1;
      if (idx < 0 || idx >= PALETTE_ITEMS.length) return;
      const st = useEditorStore.getState();
      if (!st.form || isOverlayForm(st.form)) return;
      const target =
        st.activeSectionId ||
        st.selected?.sectionId ||
        st.form.sections[st.form.sections.length - 1]?.id;
      if (!target) return;
      e.preventDefault();
      st.addQuestion(target, PALETTE_ITEMS[idx].type);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!form) return null;

  // 문항은 섹션 그룹핑으로 다른 섹션에 있을 수 있으므로 전체에서 찾는다.
  const selectedEntry = selected
    ? form.sections
        .flatMap((s) => s.questions.map((q) => ({ sectionId: s.id, question: q })))
        .find((e) => e.question.id === selected.questionId)
    : undefined;
  const selectedQuestion = selectedEntry?.question;
  const selectedSectionId = selectedEntry?.sectionId ?? selected?.sectionId ?? '';

  // 오버레이(PDF) 문진은 표/집중 모드가 없어 기본 편집기만
  const effectiveMode = isOverlayForm(form) ? 'sections' : editMode;

  const handleSave = async () => {
    try {
      if (form.category) addCategory(form.category); // 사용한 분류를 관리 목록에 등록
      await saveForm(form);
      setToast('저장되었습니다');
    } catch (e) {
      setToast('저장 실패: ' + (e as Error).message);
    }
  };

  const handlePublish = async () => {
    try {
      if (form.category) addCategory(form.category);
      await saveForm(form);
      await publishForm(form.id);
      setToast('인증저장되었습니다 (응답 화면에서 확인 가능)');
    } catch (e) {
      setToast('인증저장 실패: ' + (e as Error).message);
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky" color="primary" elevation={0}>
        <Toolbar variant="dense">
          <Button color="inherit" startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
            목록
          </Button>
          <Stack direction="row" spacing={0.5} sx={{ ml: 1 }}>
            <Tooltip title="실행 취소 (Ctrl+Z)">
              <span>
                <IconButton color="inherit" size="small" disabled={!canUndo} onClick={undo}>
                  <UndoIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="다시 실행 (Ctrl+Shift+Z)">
              <span>
                <IconButton color="inherit" size="small" disabled={!canRedo} onClick={redo}>
                  <RedoIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="subtitle1" noWrap>
              {form.title || '제목 없는 문진'}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            {!isOverlayForm(form) && (
              <ToggleButtonGroup
                exclusive
                size="small"
                value={editMode}
                onChange={(_e, v) => v && setEditMode(v)}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.15)',
                  borderRadius: 1,
                  mr: 0.5,
                  '& .MuiToggleButton-root': {
                    color: 'rgba(255,255,255,0.85)',
                    border: 0,
                    px: 1,
                    py: 0.4,
                    '&.Mui-selected': {
                      bgcolor: '#fff',
                      color: 'primary.main',
                      '&:hover': { bgcolor: '#fff' },
                    },
                  },
                }}
              >
                <ToggleButton value="sections">
                  <Tooltip title="기본 편집기">
                    <ViewSidebarRoundedIcon fontSize="small" />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="table">
                  <Tooltip title="표(빠른 입력)">
                    <TableChartOutlinedIcon fontSize="small" />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="focus">
                  <Tooltip title="집중 편집">
                    <CenterFocusStrongRoundedIcon fontSize="small" />
                  </Tooltip>
                </ToggleButton>
              </ToggleButtonGroup>
            )}
            {effectiveMode === 'sections' && (
              <Tooltip title="영역 위치 바꾸기">
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={(e) => setLayoutAnchor(e.currentTarget)}
                >
                  <ViewColumnIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {effectiveMode === 'sections' && !isOverlayForm(form) && (
              <Tooltip title={sidePreview ? '미리보기 패널 숨기기' : '미리보기 패널 표시'}>
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={toggleSidePreview}
                  sx={{ opacity: sidePreview ? 1 : 0.6 }}
                >
                  <ViewSidebarIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {!isOverlayForm(form) && (
              <Tooltip title={popoutPreview ? '미리보기 창 닫기' : '미리보기를 새 창으로 열기 (2모니터)'}>
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={() => setPopoutPreview((v) => !v)}
                  sx={{ bgcolor: popoutPreview ? 'rgba(255,255,255,0.22)' : 'transparent' }}
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Button color="inherit" startIcon={<VisibilityIcon />} onClick={() => setPreview(true)}>
              전체 미리보기
            </Button>
            <Button color="inherit" startIcon={<SaveIcon />} onClick={handleSave}>
              저장{dirty ? ' *' : ''}
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<PublishIcon />}
              onClick={handlePublish}
            >
              인증저장
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {effectiveMode === 'table' ? (
        <Box sx={{ flex: 1, overflow: 'hidden', bgcolor: 'background.default' }}>
          <TableEditor form={form} />
        </Box>
      ) : effectiveMode === 'focus' ? (
        <Box sx={{ flex: 1, overflow: 'hidden', bgcolor: 'background.default' }}>
          <FocusEditor form={form} />
        </Box>
      ) : (
      <Box
        ref={splitRef}
        sx={{ flex: 1, overflow: 'hidden', display: 'flex', bgcolor: 'background.default' }}
      >
        {(() => {
          const showPreview = sidePreview && !isOverlayForm(form);
          const visibleKeys = panelOrder.filter((k) => (k === 'preview' ? showPreview : true));

          const dividerNode = (leftKey: string, rightKey: string) => (
            <Tooltip title="드래그하여 폭 조절" placement="top">
              <Box
                onMouseDown={startDividerDrag(leftKey, rightKey, visibleKeys)}
                sx={{
                  flexShrink: 0,
                  width: '8px',
                  cursor: 'col-resize',
                  position: 'relative',
                  bgcolor: 'divider',
                  transition: 'background-color .15s',
                  '&:hover': { bgcolor: 'primary.main' },
                  '&:hover .grip': { bgcolor: 'primary.contrastText' },
                  '&::before': { content: '""', position: 'absolute', inset: '0 -4px' },
                }}
              >
                <Box
                  className="grip"
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '2px',
                    height: 34,
                    borderRadius: 1,
                    bgcolor: 'text.disabled',
                  }}
                />
              </Box>
            </Tooltip>
          );

          const renderPanel = (key: string) => {
            if (key === 'preview') {
              return (
                <Box
                  sx={{
                    flexGrow: sizes.preview ?? 1,
                    flexBasis: 0,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'background.default',
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{
                      px: 2,
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                    }}
                  >
                    <VisibilityIcon fontSize="small" color="action" />
                    <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
                      미리보기
                    </Typography>
                    <Chip label="실시간" size="small" color="success" variant="outlined" />
                    <Tooltip
                      title={popoutPreview ? '미리보기 창 닫기' : '새 창으로 열기 (2모니터)'}
                    >
                      <IconButton
                        size="small"
                        color={popoutPreview ? 'primary' : 'default'}
                        onClick={() => setPopoutPreview((v) => !v)}
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="전체 화면으로 보기">
                      <IconButton size="small" onClick={() => setPreview(true)}>
                        <OpenInFullIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                  {popoutPreview ? (
                    <Box
                      sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1.5,
                        p: 3,
                        color: 'text.secondary',
                        textAlign: 'center',
                      }}
                    >
                      <OpenInNewIcon color="primary" />
                      <Typography variant="body2">별도 창에서 미리보기 중입니다.</Typography>
                      <Typography variant="caption">
                        미리보기 창을 두 번째 모니터로 옮겨 함께 작업하세요.
                      </Typography>
                      <Button size="small" variant="outlined" onClick={() => setPopoutPreview(false)}>
                        이 패널로 되돌리기
                      </Button>
                    </Box>
                  ) : (
                    <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
                      <PreviewErrorBoundary>
                        <FormRenderer key={form.id} schema={form} preview />
                      </PreviewErrorBoundary>
                    </Box>
                  )}
                </Box>
              );
            }
            return (
              <Box
                sx={{ flexGrow: sizes[key] ?? 1, flexBasis: 0, minWidth: 0, overflowY: 'auto', p: 2.5 }}
              >
                {key === 'options' ? (
                  selectedQuestion && selected ? (
                    <Paper variant="outlined" sx={{ p: 2.5 }}>
                      <QuestionEditPanel sectionId={selectedSectionId} question={selectedQuestion} />
                    </Paper>
                  ) : (
                    <Box
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'text.disabled',
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="body1">문항을 선택하면</Typography>
                      <Typography variant="body1">여기에서 옵션을 편집할 수 있습니다.</Typography>
                      <Divider sx={{ my: 2, width: 120 }} />
                      <Typography variant="caption">
                        AI 자동 변환 결과는 초안입니다. 반드시 확인·수정하세요.
                      </Typography>
                    </Box>
                  )
                ) : (
                  <>
                    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        mb={metaCollapsed ? 0 : 1.5}
                      >
                        <Chip
                          label={
                            form.status === 'published'
                              ? '인증저장'
                              : form.status === 'archived'
                                ? '보관됨'
                                : '임시저장'
                          }
                          color={form.status === 'published' ? 'primary' : 'default'}
                          size="small"
                        />
                        <Chip label={`v${form.version}`} size="small" variant="outlined" />
                        {metaCollapsed ? (
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            noWrap
                            sx={{ flex: 1, minWidth: 0 }}
                          >
                            {form.title || '제목 없는 문진'}
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }} noWrap>
                            {form.id}
                          </Typography>
                        )}
                        <Tooltip title={metaCollapsed ? '문진 정보 펼치기' : '문진 정보 접기'}>
                          <IconButton size="small" onClick={toggleMeta}>
                            {metaCollapsed ? (
                              <ExpandMoreIcon fontSize="small" />
                            ) : (
                              <ExpandLessIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                      </Stack>
                      <Collapse in={!metaCollapsed} timeout="auto" unmountOnExit>
                        <TextField
                          label="문진 제목"
                          size="small"
                          fullWidth
                          value={form.title}
                          onChange={(e) => updateMeta({ title: e.target.value })}
                          sx={{ mb: 1.5 }}
                        />
                        <TextField
                          label="설명 (선택)"
                          size="small"
                          fullWidth
                          multiline
                          minRows={2}
                          value={form.description ?? ''}
                          onChange={(e) => updateMeta({ description: e.target.value })}
                          sx={{ mb: 1.5 }}
                        />
                        <Autocomplete
                          freeSolo
                          options={categories}
                          value={form.category ?? ''}
                          onInputChange={(_e, v, reason) => {
                            if (reason === 'input') updateMeta({ category: v.trim() || undefined });
                          }}
                          onChange={(_e, v) => {
                            const val = (typeof v === 'string' ? v : v ?? '').trim();
                            updateMeta({ category: val || undefined });
                            if (val) addCategory(val);
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="분류 (선택)"
                              size="small"
                              placeholder="예: 건강검진"
                            />
                          )}
                          sx={{ mb: 1.5 }}
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={!!form.testFlag}
                              onChange={(e) => updateMeta({ testFlag: e.target.checked })}
                            />
                          }
                          label="테스트 대상 (환자 화면에 노출)"
                        />
                      </Collapse>
                    </Paper>

                    {isOverlayForm(form) ? (
                      <OverlayEditor form={form} />
                    ) : (
                      <>
                        <ComponentPalette
                          onAdd={(t) => {
                            const targetSectionId =
                              activeSectionId ||
                              selectedSectionId ||
                              form.sections[form.sections.length - 1]?.id;
                            if (targetSectionId) addQuestion(targetSectionId, t);
                          }}
                        />
                        <EditorOutline form={form} />
                      </>
                    )}
                  </>
                )}
              </Box>
            );
          };

          return visibleKeys.map((key, i) => (
            <Fragment key={key}>
              {renderPanel(key)}
              {i < visibleKeys.length - 1 && dividerNode(key, visibleKeys[i + 1])}
            </Fragment>
          ));
        })()}
      </Box>
      )}

      {/* 영역 순서 바꾸기 메뉴 */}
      <Menu
        anchorEl={layoutAnchor}
        open={!!layoutAnchor}
        onClose={() => setLayoutAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { minWidth: 260, py: 0.5 } }}
      >
        <Typography sx={{ px: 2, pt: 0.5, pb: 1, fontSize: 12, color: 'text.secondary' }}>
          영역 순서 (왼쪽 → 오른쪽)
        </Typography>
        {panelOrder.map((key, i) => {
          const hidden = key === 'preview' && (!sidePreview || isOverlayForm(form));
          return (
            <Box
              key={key}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.5 }}
            >
              <Typography
                sx={{ flex: 1, fontSize: 14, color: hidden ? 'text.disabled' : 'text.primary' }}
              >
                {i + 1}. {PANEL_LABEL[key]}
                {hidden ? ' (숨김)' : ''}
              </Typography>
              <Tooltip title="왼쪽으로">
                <span>
                  <IconButton size="small" disabled={i === 0} onClick={() => movePanel(key, -1)}>
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="오른쪽으로">
                <span>
                  <IconButton
                    size="small"
                    disabled={i === panelOrder.length - 1}
                    onClick={() => movePanel(key, 1)}
                  >
                    <ChevronRightIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          );
        })}
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={() => {
            persistOrder(DEFAULT_ORDER);
            setLayoutAnchor(null);
          }}
        >
          기본 순서로 되돌리기
        </MenuItem>
      </Menu>

      {popoutPreview && !isOverlayForm(form) && (
        <PreviewWindow onClose={() => setPopoutPreview(false)}>
          <Box sx={{ p: 2, maxWidth: 820, mx: 'auto' }}>
            <PreviewErrorBoundary>
              <FormRenderer key={form.id} schema={form} preview />
            </PreviewErrorBoundary>
          </Box>
        </PreviewWindow>
      )}

      <PreviewDialog open={preview} schema={form} onClose={() => setPreview(false)} />
      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast('')}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
