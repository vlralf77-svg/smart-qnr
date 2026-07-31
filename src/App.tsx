import { useEffect, useMemo } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { buildTheme } from './theme';
import { useThemeSettings } from './store/useThemeSettings';
import FormList from './pages/FormList';
import FormEditor from './pages/FormEditor';
import ResponseForm from './pages/ResponseForm';
import UploadConvert from './pages/UploadConvert';
import Login from './pages/Login';
import Accounts from './pages/Accounts';
import IntegrationConfig from './pages/IntegrationConfig';
import LogViewer from './pages/LogViewer';
import StatsPage from './pages/StatsPage';
import PatientLogin from './pages/PatientLogin';
import PatientForms from './pages/PatientForms';
import PatientRespond from './pages/PatientRespond';
import PatientView from './pages/PatientView';
import { installLogCapture } from './utils/logCapture';
import { setLogContextResolver } from './store/useLogStore';
import { startLogShipper } from './utils/logShipper';
import { APP_VERSION } from './version';
import { useAuthStore } from './store/useAuthStore';
import { usePatientStore } from './store/usePatientStore';
import { Permissions } from './store/useAccountsStore';
import UpdateStatus from './components/UpdateStatus';
import QuitConfirm from './components/QuitConfirm';
import UpdateReady from './components/UpdateReady';

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
  // 화면 로그 캡처(콘솔/전역 오류/네트워크) 설치 + 중앙 전송기 시작 — 1회
  useEffect(() => {
    installLogCapture();
    const platform = window.smartqnr ? 'electron' : 'web';
    // 각 로그에 현재 사용자 컨텍스트를 붙임(중앙 수집 시 사용자별 필터에 사용)
    setLogContextResolver(() => {
      const a = useAuthStore.getState();
      const p = usePatientStore.getState();
      const userId = a.currentUser ?? (p.patientNo ? `patient:${p.patientNo}` : undefined);
      const userName =
        a.displayName ?? a.currentUser ?? (p.name ? `환자:${p.name}` : undefined);
      return {
        userId,
        userName,
        department: a.department ?? undefined,
        role: a.currentUser ? 'staff' : p.patientNo ? 'patient' : undefined,
        appVersion: APP_VERSION,
        platform,
        route: window.location.hash || '/',
      };
    });
    startLogShipper();
  }, []);

  // 사용자가 고른 강조 색상·다크모드로 테마 구성
  const brand = useThemeSettings((s) => s.brand);
  const mode = useThemeSettings((s) => s.mode);
  const customColor = useThemeSettings((s) => s.customColor);
  const activeTheme = useMemo(
    () => buildTheme(brand, mode, customColor),
    [brand, mode, customColor],
  );

  return (
    <ThemeProvider theme={activeTheme}>
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
            path="/integration"
            element={
              <RequireAuth>
                <RequirePermission perm="manageAccounts">
                  <IntegrationConfig />
                </RequirePermission>
              </RequireAuth>
            }
          />
          <Route
            path="/stats"
            element={
              <RequireAuth>
                <StatsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/logs"
            element={
              <RequireAuth>
                <RequirePermission perm="manageAccounts">
                  <LogViewer />
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
      {/* 종료 확인 모달(Electron 전용) */}
      <QuitConfirm />
      {/* 업데이트 준비 완료 모달(Electron 전용) */}
      <UpdateReady />
    </ThemeProvider>
  );
}
