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

  const handleRenameParent = (parent: string) => {
    const v = window.prompt('대분류 이름 변경', parent);
    if (v == null) return;
    const next = v.trim();
    if (!next || next === parent) return;
    if (next.includes(CATEGORY_SEP)) {
      window.alert(`'${CATEGORY_SEP.trim()}' 는 쓸 수 없습니다.`);
      return;
    }
    renameCategory(parent, next);
    remapForms(parent, next);
  };

  const handleRenameChild = (path: string) => {
    const { parent, child } = splitCategory(path);
    const v = window.prompt('하위 분류 이름 변경', child ?? '');
    if (v == null) return;
    const next = v.trim();
    if (!next || next === child) return;
    if (next.includes(CATEGORY_SEP)) {
      window.alert(`'${CATEGORY_SEP.trim()}' 는 쓸 수 없습니다.`);
      return;
    }
    const newPath = makeCategoryPath(parent, next);
    renameCategory(path, newPath);
    remapForms(path, newPath);
  };

  const handleRemove = (path: string, isParent: boolean) => {
    const n = usageUnder(path);
    const extra = isParent ? ' (하위 분류도 함께 삭제됩니다)' : '';
    const msg =
      n > 0
        ? `"${path}"${extra}\n이 분류의 문진 ${n}개는 분류 없음으로 바뀝니다. 삭제할까요?`
        : `"${path}" 분류를 삭제할까요?${extra}`;
    if (!window.confirm(msg)) return;
    removeCategory(path);
    dropForms(path);
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
            sx={{ flexShrink: 0, whiteSpace: 'nowrap', wordBreak: 'keep-all', minWidth: 116, px: 2 }}
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
                    <IconButton size="small" sx={{ p: 0.5 }} onClick={() => handleRenameParent(parent)}>
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="대분류 삭제">
                    <IconButton
                      size="small"
                      color="error"
                      sx={{ p: 0.5 }}
                      onClick={() => handleRemove(parent, true)}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* 하위 분류 목록 */}
                <Stack spacing={0.25} sx={{ px: 1.5, py: 0.75 }}>
                  {children.map((path) => (
                    <Box key={path} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 0.5 }}>
                      <SubdirectoryArrowRightIcon
                        sx={{ color: 'text.disabled', fontSize: 16 }}
                      />
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
                        <IconButton size="small" sx={{ p: 0.5 }} onClick={() => handleRenameChild(path)}>
                          <EditIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="하위 삭제">
                        <IconButton
                          size="small"
                          color="error"
                          sx={{ p: 0.5 }}
                          onClick={() => handleRemove(path, false)}
                        >
                          <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ))}

                  {/* 하위 추가 입력 */}
                  <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="nowrap" sx={{ pl: 0.5, mt: 0.25 }}>
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
                      sx={{ flexShrink: 0, whiteSpace: 'nowrap', wordBreak: 'keep-all', minWidth: 76 }}
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
    </Dialog>
  );
}
