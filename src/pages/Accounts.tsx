// 계정 관리 — 하위 계정 생성 + 계정별 권한(조회/수정/삭제/계정관리) 부여.
//  내장 admin 은 항상 전체 권한이며 편집/삭제 불가.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Checkbox,
  Chip,
  Container,
  FormControlLabel,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LockResetIcon from '@mui/icons-material/LockReset';
import { useAccountsStore, Permissions } from '@/store/useAccountsStore';
import { hashPassword } from '@/utils/hash';

const PERM_LABELS: { key: keyof Permissions; label: string; hint: string }[] = [
  { key: 'view', label: '조회', hint: '목록·응답 보기' },
  { key: 'edit', label: '수정', hint: '문진 생성·편집·발행' },
  { key: 'delete', label: '삭제', hint: '문진 삭제' },
  { key: 'manageAccounts', label: '계정관리', hint: '계정 생성·권한 부여' },
];

const DEFAULT_PERMS: Permissions = { view: true, edit: false, delete: false, manageAccounts: false };

export default function Accounts() {
  const navigate = useNavigate();
  const { accounts, addAccount, updatePermissions, setPassword, removeAccount } = useAccountsStore();
  const [username, setUsername] = useState('');
  const [password, setPassword2] = useState('');
  const [perms, setPerms] = useState<Permissions>(DEFAULT_PERMS);
  const [toast, setToast] = useState('');

  const handleAdd = async () => {
    const name = username.trim();
    if (!name) return setToast('아이디를 입력하세요.');
    if (name.toLowerCase() === 'admin') return setToast("'admin'은 사용할 수 없습니다.");
    if (password.length < 4) return setToast('비밀번호는 4자 이상이어야 합니다.');
    if (accounts.some((a) => a.username.toLowerCase() === name.toLowerCase()))
      return setToast('이미 있는 아이디입니다.');
    const hash = await hashPassword(password);
    const id = addAccount(name, hash, perms);
    if (!id) return setToast('계정을 만들 수 없습니다.');
    setUsername('');
    setPassword2('');
    setPerms(DEFAULT_PERMS);
    setToast(`계정 '${name}' 생성됨`);
  };

  const handleResetPw = async (id: string, name: string) => {
    const pw = window.prompt(`'${name}' 새 비밀번호 (4자 이상)`);
    if (pw == null) return;
    if (pw.length < 4) return setToast('비밀번호는 4자 이상이어야 합니다.');
    setPassword(id, await hashPassword(pw));
    setToast('비밀번호가 변경되었습니다.');
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`'${name}' 계정을 삭제할까요?`)) {
      removeAccount(id);
      setToast('삭제되었습니다.');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f6f8' }}>
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar variant="dense">
          <Button color="inherit" startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
            목록
          </Button>
          <Typography variant="h6" sx={{ ml: 1, flex: 1 }}>
            계정 관리
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: { xs: 3, sm: 4 } }}>
        {/* 새 계정 만들기 */}
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={800} mb={1.5}>
            새 계정 만들기
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 1.5 }}>
            <TextField
              label="아이디"
              size="small"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              sx={{ flex: 1 }}
            />
            <TextField
              label="비밀번호"
              size="small"
              type="password"
              value={password}
              onChange={(e) => setPassword2(e.target.value)}
              sx={{ flex: 1 }}
            />
          </Stack>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center">
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
              권한
            </Typography>
            {PERM_LABELS.map((p) => (
              <Tooltip key={p.key} title={p.hint}>
                <FormControlLabel
                  sx={{ mr: 1 }}
                  control={
                    <Checkbox
                      size="small"
                      checked={perms[p.key]}
                      onChange={(e) =>
                        setPerms((prev) => ({ ...prev, [p.key]: e.target.checked }))
                      }
                    />
                  }
                  label={p.label}
                />
              </Tooltip>
            ))}
            <Box sx={{ flex: 1 }} />
            <Button
              variant="contained"
              startIcon={<PersonAddAlt1Icon />}
              onClick={handleAdd}
            >
              계정 추가
            </Button>
          </Stack>
        </Paper>

        {/* 계정 목록 */}
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: '#f7f8fa', fontWeight: 700 } }}>
                <TableCell>계정</TableCell>
                {PERM_LABELS.map((p) => (
                  <TableCell key={p.key} align="center" width={78}>
                    {p.label}
                  </TableCell>
                ))}
                <TableCell align="right" width={110}>
                  작업
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* 내장 admin */}
              <TableRow hover>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography fontWeight={700}>admin</Typography>
                    <Chip size="small" label="내장" variant="outlined" />
                  </Stack>
                </TableCell>
                {PERM_LABELS.map((p) => (
                  <TableCell key={p.key} align="center">
                    <Checkbox size="small" checked disabled />
                  </TableCell>
                ))}
                <TableCell align="right">
                  <Typography variant="caption" color="text.disabled">
                    전체 권한
                  </Typography>
                </TableCell>
              </TableRow>

              {/* 하위 계정 */}
              {accounts.map((a) => (
                <TableRow key={a.id} hover>
                  <TableCell>
                    <Typography fontWeight={700}>{a.username}</Typography>
                  </TableCell>
                  {PERM_LABELS.map((p) => (
                    <TableCell key={p.key} align="center">
                      <Checkbox
                        size="small"
                        checked={a.permissions[p.key]}
                        onChange={(e) =>
                          updatePermissions(a.id, { ...a.permissions, [p.key]: e.target.checked })
                        }
                      />
                    </TableCell>
                  ))}
                  <TableCell align="right">
                    <Tooltip title="비밀번호 재설정">
                      <IconButton size="small" onClick={() => handleResetPw(a.id, a.username)}>
                        <LockResetIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="계정 삭제">
                      <IconButton size="small" color="error" onClick={() => handleDelete(a.id, a.username)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}

              {accounts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                      추가된 계정이 없습니다. 위에서 새 계정을 만들어 권한을 부여하세요.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          권한 체크박스는 즉시 저장됩니다. 조회=목록·응답 보기, 수정=문진 생성·편집·발행, 삭제=문진
          삭제, 계정관리=이 화면 접근.
        </Typography>
      </Container>

      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="info" variant="filled" onClose={() => setToast('')}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
