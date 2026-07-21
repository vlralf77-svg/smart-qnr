// 분류(카테고리) 관리 다이얼로그 — 추가/이름변경/삭제.
//  이름변경·삭제 시 해당 분류를 쓰는 문진에도 반영(연쇄 저장).
import { useState } from 'react';
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
import { FormSchema } from '@/types/schema';
import { useCategoriesStore } from '@/store/useCategoriesStore';
import { useFormsStore } from '@/store/useFormsStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CategoryManager({ open, onClose }: Props) {
  const { categories, addCategory, renameCategory, removeCategory } = useCategoriesStore();
  const forms = useFormsStore((s) => s.forms);
  const saveForm = useFormsStore((s) => s.saveForm);
  const [newName, setNewName] = useState('');

  const usageCount = (name: string) => forms.filter((f) => f.category === name).length;

  const handleAdd = () => {
    const v = newName.trim();
    if (!v) return;
    addCategory(v);
    setNewName('');
  };

  const handleRename = (oldName: string) => {
    const v = window.prompt('분류 이름 변경', oldName);
    if (v == null) return;
    const next = v.trim();
    if (!next || next === oldName) return;
    if (categories.includes(next)) {
      window.alert('이미 있는 분류입니다.');
      return;
    }
    renameCategory(oldName, next);
    // 이 분류를 쓰는 문진들도 새 이름으로 갱신
    forms
      .filter((f) => f.category === oldName)
      .forEach((f) => void saveForm({ ...f, category: next }));
  };

  const handleRemove = (name: string) => {
    const n = usageCount(name);
    const msg =
      n > 0
        ? `"${name}" 분류를 삭제하면 이 분류의 문진 ${n}개는 분류 없음으로 바뀝니다. 삭제할까요?`
        : `"${name}" 분류를 삭제할까요?`;
    if (!window.confirm(msg)) return;
    removeCategory(name);
    forms
      .filter((f) => f.category === name)
      .forEach((f) => {
        const { category: _drop, ...rest } = f;
        void saveForm(rest as FormSchema);
      });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>분류 관리</DialogTitle>
      <DialogContent dividers>
        {/* 추가 */}
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="새 분류 이름"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
            추가
          </Button>
        </Stack>

        {/* 목록 */}
        {categories.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            분류가 없습니다. 위에서 추가하세요.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {categories.map((c) => (
              <Box
                key={c}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                }}
              >
                <Typography sx={{ flex: 1, fontWeight: 600 }}>{c}</Typography>
                <Chip size="small" label={`문진 ${usageCount(c)}`} variant="outlined" />
                <Tooltip title="이름 변경">
                  <IconButton size="small" onClick={() => handleRename(c)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="삭제">
                  <IconButton size="small" color="error" onClick={() => handleRemove(c)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
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
