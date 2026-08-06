// 분류(카테고리) 관리 다이얼로그 — 2뎁스(대분류/소분류) 추가·이름변경·삭제.
//  이름변경·삭제 시 해당 분류(및 하위)를 쓰는 문진에도 반영(연쇄 저장).
import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import { FormSchema } from '@/types/schema';
import {
  useCategoriesStore,
  CATEGORY_SEP,
  splitCategory,
  makeCategoryPath,
} from '@/store/useCategoriesStore';
import { useFormsStore } from '@/store/useFormsStore';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CategoryManager({ open, onClose }: Props) {
  const { categories, addCategory, addSubCategory, renameCategory, removeCategory } =
    useCategoriesStore();
  const forms = useFormsStore((s) => s.forms);
  const saveForm = useFormsStore((s) => s.saveForm);
  const [newParent, setNewParent] = useState('');
  const [subInput, setSubInput] = useState<Record<string, string>>({});
  // 이름 변경 다이얼로그 상태 (Electron 은 window.prompt 를 지원하지 않아 인앱 입력창 사용)
  const [renameState, setRenameState] = useState<{
    path: string;
    isParent: boolean;
    value: string;
  } | null>(null);
  // 삭제 확인 다이얼로그 상태 (window.confirm 대체 — 테마 적용 인앱 다이얼로그)
  const [removeState, setRemoveState] = useState<{ path: string; isParent: boolean } | null>(null);

  // 트리 구성: 대분류 목록(명시 + 하위경로에서 유추) + 대분류별 하위경로
  const tree = useMemo(() => {
    const parents = Array.from(
      new Set([
        ...categories.filter((c) => !c.includes(CATEGORY_SEP)),
        ...categories.filter((c) => c.includes(CATEGORY_SEP)).map((c) => splitCategory(c).parent),
      ]),
    );
    return parents.map((p) => ({
      parent: p,
      children: categories.filter((c) => c.startsWith(p + CATEGORY_SEP)),
    }));
  }, [categories]);

  // 정확히 이 경로를 쓰는 문진 수
  const usageExact = (path: string) => forms.filter((f) => f.category === path).length;
  // 이 경로 및 하위까지 포함한 문진 수(대분류 배지용)
  const usageUnder = (path: string) =>
    forms.filter((f) => f.category === path || f.category?.startsWith(path + CATEGORY_SEP)).length;

  // 문진 연쇄 갱신 — 경로 접두 교체(이름변경) / 제거(삭제)
  const remapForms = (oldPath: string, newPath: string) => {
    const prefix = oldPath + CATEGORY_SEP;
    forms.forEach((f) => {
      if (f.category === oldPath) void saveForm({ ...f, category: newPath });
      else if (f.category?.startsWith(prefix))
        void saveForm({ ...f, category: newPath + CATEGORY_SEP + f.category.slice(prefix.length) });
    });
  };
  const dropForms = (path: string) => {
    const prefix = path + CATEGORY_SEP;
    forms.forEach((f) => {
      if (f.category === path || f.category?.startsWith(prefix)) {
        const { category: _drop, ...rest } = f;
        void saveForm(rest as FormSchema);
      }
    });
  };

  const handleAddParent = () => {
    const v = newParent.trim();
    if (!v) return;
    if (v.includes(CATEGORY_SEP)) {
      window.alert(`대분류 이름에는 '${CATEGORY_SEP.trim()}' 를 쓸 수 없습니다.`);
      return;
    }
    addCategory(v);
    setNewParent('');
  };

  const handleAddSub = (parent: string) => {
    const v = (subInput[parent] ?? '').trim();
    if (!v) return;
    if (v.includes(CATEGORY_SEP)) {
      window.alert(`하위 분류 이름에는 '${CATEGORY_SEP.trim()}' 를 쓸 수 없습니다.`);
      return;
    }
    addSubCategory(parent, v);
    setSubInput((m) => ({ ...m, [parent]: '' }));
  };

  // 이름 변경 다이얼로그 열기(대분류/하위 공통)
  const openRename = (path: string, isParent: boolean) =>
    setRenameState({
      path,
      isParent,
      value: isParent ? path : (splitCategory(path).child ?? ''),
    });

  // 이름 변경 확정
  const confirmRename = () => {
    if (!renameState) return;
    const { path, isParent, value } = renameState;
    const next = value.trim();
    const current = isParent ? path : (splitCategory(path).child ?? '');
    if (!next || next === current) {
      setRenameState(null);
      return;
    }
    if (next.includes(CATEGORY_SEP)) {
      window.alert(`'${CATEGORY_SEP.trim()}' 는 쓸 수 없습니다.`);
      return;
    }
    const newPath = isParent ? next : makeCategoryPath(splitCategory(path).parent, next);
    renameCategory(path, newPath);
    remapForms(path, newPath);
    setRenameState(null);
  };

  const confirmRemove = () => {
    if (!removeState) return;
    removeCategory(removeState.path);
    dropForms(removeState.path);
    setRemoveState(null);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>
        분류 관리
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', fontWeight: 400 }}
        >
          대분류 아래 하위 분류(2뎁스)를 만들 수 있습니다.
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {/* 대분류 추가 */}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="nowrap" sx={{ mb: 2 }}>
          <TextField
            size="small"
            placeholder="새 대분류 이름"
            value={newParent}
            sx={{ flex: 1, minWidth: 0 }}
            onChange={(e) => setNewParent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddParent();
              }
            }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddParent}
            sx={{
              flexShrink: 0,
              whiteSpace: 'nowrap',
              wordBreak: 'keep-all',
              minWidth: 116,
              px: 2,
            }}
          >
            대분류
          </Button>
        </Stack>

        {tree.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            분류가 없습니다. 위에서 대분류를 추가하세요.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {tree.map(({ parent, children }) => (
              <Box
                key={parent}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                {/* 대분류 행 */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1.25,
                    py: 0.5,
                    bgcolor: 'action.hover',
                  }}
                >
                  <Typography sx={{ flex: 1, fontWeight: 800, fontSize: 13.5 }} noWrap>
                    {parent}
                  </Typography>
                  <Chip
                    size="small"
                    label={usageUnder(parent)}
                    variant="outlined"
                    sx={{ height: 18, fontSize: 11, '& .MuiChip-label': { px: 0.75 } }}
                  />
                  <Tooltip title="대분류 이름 변경">
                    <IconButton
                      size="small"
                      sx={{ p: 0.5 }}
                      onClick={() => openRename(parent, true)}
                    >
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="대분류 삭제">
                    <IconButton
                      size="small"
                      color="error"
                      sx={{ p: 0.5 }}
                      onClick={() => setRemoveState({ path: parent, isParent: true })}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* 하위 분류 목록 */}
                <Stack spacing={0.25} sx={{ px: 1.5, py: 0.75 }}>
                  {children.map((path) => (
                    <Box
                      key={path}
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 0.5 }}
                    >
                      <SubdirectoryArrowRightIcon sx={{ color: 'text.disabled', fontSize: 16 }} />
                      <Typography sx={{ flex: 1, fontSize: 13 }} noWrap>
                        {splitCategory(path).child}
                      </Typography>
                      <Chip
                        size="small"
                        label={usageExact(path)}
                        variant="outlined"
                        sx={{ height: 18, fontSize: 11, '& .MuiChip-label': { px: 0.75 } }}
                      />
                      <Tooltip title="하위 이름 변경">
                        <IconButton
                          size="small"
                          sx={{ p: 0.5 }}
                          onClick={() => openRename(path, false)}
                        >
                          <EditIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="하위 삭제">
                        <IconButton
                          size="small"
                          color="error"
                          sx={{ p: 0.5 }}
                          onClick={() => setRemoveState({ path, isParent: false })}
                        >
                          <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ))}

                  {/* 하위 추가 입력 */}
                  <Stack
                    direction="row"
                    spacing={0.75}
                    alignItems="center"
                    flexWrap="nowrap"
                    sx={{ pl: 0.5, mt: 0.25 }}
                  >
                    <TextField
                      size="small"
                      placeholder="하위 분류 추가"
                      value={subInput[parent] ?? ''}
                      sx={{ flex: 1, minWidth: 0 }}
                      onChange={(e) => setSubInput((m) => ({ ...m, [parent]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSub(parent);
                        }
                      }}
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => handleAddSub(parent)}
                      sx={{
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        wordBreak: 'keep-all',
                        minWidth: 76,
                      }}
                    >
                      추가
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>

      {/* 이름 변경 입력 다이얼로그 (Electron 호환 — window.prompt 대체) */}
      <Dialog
        open={renameState != null}
        onClose={() => setRenameState(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {renameState?.isParent ? '대분류 이름 변경' : '하위 분류 이름 변경'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="새 이름"
            value={renameState?.value ?? ''}
            onChange={(e) => setRenameState((s) => (s ? { ...s, value: e.target.value } : s))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                confirmRename();
              }
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameState(null)}>취소</Button>
          <Button variant="contained" onClick={confirmRename}>
            변경
          </Button>
        </DialogActions>
      </Dialog>

      {/* 삭제 확인 다이얼로그 (window.confirm 대체 — 테마 적용) */}
      <ConfirmDialog
        open={removeState != null}
        title={removeState?.isParent ? '대분류 삭제' : '하위 분류 삭제'}
        icon={<DeleteOutlineIcon sx={{ fontSize: 32 }} />}
        iconBg="rgba(214,69,69,0.14)"
        iconColor="#d64545"
        confirmLabel="삭제"
        confirmColor="#d64545"
        confirmHoverColor="#b53a3a"
        message={
          removeState ? (
            <>
              <b>&quot;{removeState.path}&quot;</b>
              {removeState.isParent ? ' (하위 분류도 함께 삭제됩니다)' : ''} 분류를 삭제할까요?
              {usageUnder(removeState.path) > 0 && (
                <>
                  <br />이 분류의 문진 {usageUnder(removeState.path)}개는 &lsquo;분류
                  없음&rsquo;으로 바뀝니다.
                </>
              )}
            </>
          ) : undefined
        }
        onConfirm={confirmRemove}
        onCancel={() => setRemoveState(null)}
      />
    </Dialog>
  );
}
