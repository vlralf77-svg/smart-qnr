import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { theme } from './theme';
import FormList from './pages/FormList';
import FormEditor from './pages/FormEditor';
import ResponseForm from './pages/ResponseForm';
import UploadConvert from './pages/UploadConvert';

// HashRouter: Electron(file://) 에서도 라우팅 안정적으로 동작
export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        <Routes>
          <Route path="/" element={<FormList />} />
          <Route path="/upload" element={<UploadConvert />} />
          <Route path="/editor/:formId" element={<FormEditor />} />
          <Route path="/respond/:formId" element={<ResponseForm />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}
