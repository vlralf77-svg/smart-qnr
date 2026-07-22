import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { theme } from './theme';
import FormList from './pages/FormList';
import FormEditor from './pages/FormEditor';
import ResponseForm from './pages/ResponseForm';
import UploadConvert from './pages/UploadConvert';
import Login from './pages/Login';
import Accounts from './pages/Accounts';
import PatientLogin from './pages/PatientLogin';
import PatientForms from './pages/PatientForms';
import PatientRespond from './pages/PatientRespond';
import PatientView from './pages/PatientView';
import { useAuthStore } from './store/useAuthStore';
import { usePatientStore } from './store/usePatientStore';
import { Permissions } from './store/useAccountsStore';
import UpdateStatus from './components/UpdateStatus';

// 관리자 로그인 안 된 상태면 로그인 화면으로 보냄
function RequireAuth({ children }: { children: JSX.Element }) {
  const authed = useAuthStore((s) => s.authed);
  const location = useLocation();
  if (!authed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

// 특정 권한이 없으면 목록으로 돌려보냄(로그인은 되어 있다고 가정)
function RequirePermission({ perm, children }: { perm: keyof Permissions; children: JSX.Element }) {
  const permissions = useAuthStore((s) => s.permissions);
  if (!permissions?.[perm]) return <Navigate to="/" replace />;
  return children;
}

// 환자 로그인 안 된 상태면 환자 로그인으로 보냄
function RequirePatient({ children }: { children: JSX.Element }) {
  const patientNo = usePatientStore((s) => s.patientNo);
  if (!patientNo) {
    return <Navigate to="/patient/login" replace />;
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

          {/* 환자(실사용자) 플로우 — 관리자 로그인과 별개 */}
          <Route path="/patient/login" element={<PatientLogin />} />
          <Route
            path="/patient/forms"
            element={
              <RequirePatient>
                <PatientForms />
              </RequirePatient>
            }
          />
          <Route
            path="/patient/respond/:formId"
            element={
              <RequirePatient>
                <PatientRespond />
              </RequirePatient>
            }
          />
          <Route
            path="/patient/view/:formId"
            element={
              <RequirePatient>
                <PatientView />
              </RequirePatient>
            }
          />

          <Route
            path="/"
            element={
              <RequireAuth>
                <FormList />
              </RequireAuth>
            }
          />
          <Route
            path="/accounts"
            element={
              <RequireAuth>
                <RequirePermission perm="manageAccounts">
                  <Accounts />
                </RequirePermission>
              </RequireAuth>
            }
          />
          <Route
            path="/upload"
            element={
              <RequireAuth>
                <RequirePermission perm="edit">
                  <UploadConvert />
                </RequirePermission>
              </RequireAuth>
            }
          />
          <Route
            path="/editor/:formId"
            element={
              <RequireAuth>
                <RequirePermission perm="edit">
                  <FormEditor />
                </RequirePermission>
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
      {/* 자동 업데이트 진행 표시(Electron 전용) */}
      <UpdateStatus />
    </ThemeProvider>
  );
}
