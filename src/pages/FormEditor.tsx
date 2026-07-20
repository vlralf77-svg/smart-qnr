// QNR003 문진 에디터 페이지
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Snackbar,
  Stack,
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
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import { isOverlayForm } from '@/types/schema';
import { useEditorStore } from '@/store/useEditorStore';
import { useFormsStore } from '@/store/useFormsStore';
import EditorOutline from '@/components/editor/EditorOutline';
import OverlayEditor from '@/components/editor/OverlayEditor';
import QuestionEditPanel from '@/components/editor/QuestionEditPanel';
import PreviewDialog from '@/components/editor/PreviewDialog';

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
  } = useEditorStore();
  const canUndo = useEditorStore((s) => s._past.length > 0);
  const canRedo = useEditorStore((s) => s._future.length > 0);
  const { getForm, saveForm, publishForm, fetchForm } = useFormsStore();
  const [preview, setPreview] = useState(false);
  const [toast, setToast] = useState('');

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

  if (!form) return null;

  const selectedQuestion = selected
    ? form.sections
        .find((s) => s.id === selected.sectionId)
        ?.questions.find((q) => q.id === selected.questionId)
    : undefined;

  const handleSave = async () => {
    try {
      await saveForm(form);
      setToast('저장되었습니다');
    } catch (e) {
      setToast('저장 실패: ' + (e as Error).message);
    }
  };

  const handlePublish = async () => {
    try {
      await saveForm(form);
      await publishForm(form.id);
      setToast('발행되었습니다 (응답 화면에서 확인 가능)');
    } catch (e) {
      setToast('발행 실패: ' + (e as Error).message);
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="primary" elevation={0}>
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
          <Stack direction="row" spacing={1}>
            <Button color="inherit" startIcon={<VisibilityIcon />} onClick={() => setPreview(true)}>
              미리보기
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
              발행
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', bgcolor: 'background.default' }}>
        {/* 좌: 폼 메타 + 아웃라인 */}
        <Box sx={{ width: '55%', overflowY: 'auto', p: 2.5, borderRight: '1px solid', borderColor: 'divider' }}>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
              <Chip
                label={
                  form.status === 'published' ? '발행됨' : form.status === 'archived' ? '보관됨' : '초안'
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
            />
          </Paper>

          {isOverlayForm(form) ? <OverlayEditor form={form} /> : <EditorOutline form={form} />}
        </Box>

        {/* 우: 선택 문항 편집 */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
          {selectedQuestion && selected ? (
            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <QuestionEditPanel sectionId={selected.sectionId} question={selectedQuestion} />
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
