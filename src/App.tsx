import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { theme } from './theme';
import FormList from './pages/FormList';
import FormEditor from './pages/FormEditor';
import ResponseForm from './pages/ResponseForm';
import UploadConvert from './pages/UploadConvert';
import Login from './pages/Login';
import { useAuthStore } from './store/useAuthStore';

// 로그인 안 된 상태면 로그인 화면으로 보냄
function RequireAuth({ children }: { children: JSX.Element }) {
  const authed = useAuthStore((s) => s.authed);
  const location = useLocation();
  if (!authed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

// HashRouter: Electron(file://) 에서도 라우팅 안정적으로 동작
export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <FormList />
              </RequireAuth>
            }
          />
          <Route
            path="/upload"
            element={
              <RequireAuth>
                <UploadConvert />
              </RequireAuth>
            }
          />
          <Route
            path="/editor/:formId"
            element={
              <RequireAuth>
                <FormEditor />
              </RequireAuth>
            }
          />
          <Route
            path="/respond/:formId"
            element={
              <RequireAuth>
                <ResponseForm />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}
