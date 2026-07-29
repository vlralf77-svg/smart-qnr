// QNR003 문진 에디터 페이지
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AppBar,
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
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
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
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
import PreviewDialog from '@/components/editor/PreviewDialog';
import FormRenderer from '@/components/renderer/FormRenderer';

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

  // 좌(아웃라인) ↔ 우(옵션 편집) 너비를 드래그로 조절 — 값은 브라우저에 기억
  //  · 미리보기 패널이 켜지면 3분할이라 좌측을 조금 좁게(기본 42%), 아니면 기존 55%
  const LS_KEY = 'smartqnr.editorLeftPct';
  const [leftPct, setLeftPct] = useState<number>(() => {
    const v = Number(localStorage.getItem(LS_KEY));
    return v >= 20 && v <= 70 ? v : 42;
  });
  // 우측 미리보기 패널 폭(px)도 드래그로 조절 — 옵션 설정(중앙) ↔ 미리보기 사이 구분선
  const PREVIEW_PX_KEY = 'smartqnr.editorPreviewPx';
  const PREVIEW_MIN = 300;
  const PREVIEW_MAX = 760;
  const [previewPx, setPreviewPx] = useState<number>(() => {
    const v = Number(localStorage.getItem(PREVIEW_PX_KEY));
    return v >= PREVIEW_MIN && v <= PREVIEW_MAX ? v : 400;
  });
  const splitRef = useRef<HTMLDivElement>(null);
  // 어떤 구분선을 드래그 중인지: 'left'(좌↔중) | 'preview'(중↔미리보기) | null
  const draggingRef = useRef<null | 'left' | 'preview'>(null);
  const leftPctRef = useRef(leftPct);
  leftPctRef.current = leftPct;
  const previewPxRef = useRef(previewPx);
  previewPxRef.current = previewPx;

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = splitRef.current;
      if (!draggingRef.current || !el) return;
      const rect = el.getBoundingClientRect();
      if (draggingRef.current === 'left') {
        let pct = ((e.clientX - rect.left) / rect.width) * 100;
        pct = Math.min(70, Math.max(20, pct));
        setLeftPct(pct);
      } else {
        // 미리보기 폭 = 컨테이너 우측 끝 - 커서 위치
        let px = rect.right - e.clientX;
        px = Math.min(PREVIEW_MAX, Math.max(PREVIEW_MIN, px));
        setPreviewPx(px);
      }
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      const which = draggingRef.current;
      draggingRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (which === 'left') localStorage.setItem(LS_KEY, String(Math.round(leftPctRef.current)));
      else localStorage.setItem(PREVIEW_PX_KEY, String(Math.round(previewPxRef.current)));
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const startDrag = (which: 'left' | 'preview') => (e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = which;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
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

      <Box
        ref={splitRef}
        sx={{ flex: 1, overflow: 'hidden', display: 'flex', bgcolor: 'background.default' }}
      >
        {/* 좌: 폼 메타 + 아웃라인 (너비 조절 가능) */}
        <Box sx={{ width: `${leftPct}%`, flexShrink: 0, overflowY: 'auto', p: 2.5 }}>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
              <Chip
                label={
                  form.status === 'published' ? '인증저장' : form.status === 'archived' ? '보관됨' : '임시저장'
                }
                color={form.status === 'published' ? 'success' : 'default'}
                size="small"
              />
              <Chip label={`v${form.version}`} size="small" variant="outlined" />
              <Typography variant="caption" color="text.secondary">
                {form.id}
              </Typography>
            </Stack>
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
                if (val) addCategory(val); // 새 분류면 목록에 등록
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
          </Paper>

          {isOverlayForm(form) ? (
            <OverlayEditor form={form} />
          ) : (
            <>
              {/* 상단 컴포넌트 팔레트 — 유형을 눌러 현재 섹션에 바로 삽입 */}
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
        </Box>

        {/* 좌(아웃라인) ↔ 중(옵션 설정) 너비 조절 구분선(드래그) */}
        <Tooltip title="드래그하여 너비 조절 · 더블클릭 시 기본값" placement="left">
          <Box
            onMouseDown={startDrag('left')}
            onDoubleClick={() => {
              setLeftPct(42);
              localStorage.setItem(LS_KEY, '42');
            }}
            sx={{
              flexShrink: 0,
              width: '8px',
              cursor: 'col-resize',
              position: 'relative',
              bgcolor: 'divider',
              transition: 'background-color .15s',
              '&:hover': { bgcolor: 'primary.main' },
              '&:hover .grip': { bgcolor: 'primary.contrastText' },
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: '0 -4px', // 클릭 영역을 좌우로 넓게
              },
            }}
          >
            {/* 가운데 손잡이 표시 */}
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

        {/* 우: 선택 문항 편집 */}
        <Box sx={{ flex: 1, minWidth: 0, overflowY: 'auto', p: 2.5 }}>
          {selectedQuestion && selected ? (
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
              <Typography variant="body1">왼쪽에서 문항을 선택하면</Typography>
              <Typography variant="body1">여기에서 편집할 수 있습니다.</Typography>
              <Divider sx={{ my: 2, width: 120 }} />
              <Typography variant="caption">
                AI 자동 변환 결과는 초안입니다. 반드시 확인·수정하세요.
              </Typography>
            </Box>
          )}
        </Box>

        {/* 중(옵션 설정) ↔ 우(미리보기) 너비 조절 구분선(드래그) */}
        {sidePreview && !isOverlayForm(form) && (
          <Tooltip title="드래그하여 미리보기 폭 조절 · 더블클릭 시 기본값" placement="left">
            <Box
              onMouseDown={startDrag('preview')}
              onDoubleClick={() => {
                setPreviewPx(400);
                localStorage.setItem(PREVIEW_PX_KEY, '400');
              }}
              sx={{
                flexShrink: 0,
                width: '8px',
                cursor: 'col-resize',
                position: 'relative',
                bgcolor: 'divider',
                transition: 'background-color .15s',
                '&:hover': { bgcolor: 'primary.main' },
                '&:hover .grip': { bgcolor: 'primary.contrastText' },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: '0 -4px',
                },
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
        )}

        {/* 우측: 실시간 미리보기 패널 (섹션형 문진에서 자동 표시) */}
        {sidePreview && !isOverlayForm(form) && (
          <Box
            sx={{
              width: previewPx,
              flexShrink: 0,
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
              <Tooltip title="전체 화면으로 보기">
                <IconButton size="small" onClick={() => setPreview(true)}>
                  <OpenInFullIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
              {/* 편집 내용이 바뀌면 즉시 반영 (응답 화면과 동일 렌더) */}
              <FormRenderer key={form.id} schema={form} preview />
            </Box>
          </Box>
        )}
      </Box>

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
