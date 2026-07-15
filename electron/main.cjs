// SmartQnR 관리 프로그램 (Windows exe) — Electron 메인 프로세스
const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('node:path');
const { extractText, convertToSchema } = require('./convert.cjs');

const isDev = !!process.env.ELECTRON_START_URL;

// 자동 업데이트: 설치본은 GitHub Releases 에서 새 버전을 스스로 확인·다운로드한다.
// (dev 실행에서는 동작하지 않음)
function setupAutoUpdate() {
  if (isDev) return;
  let autoUpdater;
  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch {
    return; // 패키징에 electron-updater 미포함 시 무시
  }
  autoUpdater.autoDownload = true;
  autoUpdater.on('update-downloaded', async (info) => {
    const res = await dialog.showMessageBox({
      type: 'info',
      buttons: ['지금 재시작', '나중에'],
      defaultId: 0,
      title: '업데이트 준비 완료',
      message: `새 버전(${info.version})이 다운로드되었습니다.`,
      detail: '지금 재시작하면 최신 버전으로 적용됩니다.',
    });
    if (res.response === 0) autoUpdater.quitAndInstall();
  });
  autoUpdater.on('error', (err) => {
    console.error('[auto-update] ', err == null ? 'unknown' : (err.stack || err).toString());
  });
  // 실행 직후 + 이후 6시간마다 확인
  autoUpdater.checkForUpdates().catch(() => {});
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 6 * 60 * 60 * 1000);
}

// 문서 → 문진 변환 IPC (§6): 파일 바이트 → 스키마 JSON 문자열
// 로컬 규칙 기반 변환(오픈소스) — 외부 API 호출 없음, 완전 오프라인 동작.
ipcMain.handle('convert:document', async (_event, payload) => {
  const { fileName, data } = payload || {};
  const buffer = Buffer.from(data); // data: ArrayBuffer/Uint8Array from renderer
  const { rawText, layoutHints } = await extractText(buffer, fileName);
  const schemaText = await convertToSchema({ rawText, layoutHints });
  return { schemaText, rawText };
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'SmartQnR 문진관리',
    backgroundColor: '#f4f6f8',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL(process.env.ELECTRON_START_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // vite build 결과: dist/index.html
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  // 기본 메뉴 최소화(관리 프로그램용)
  Menu.setApplicationMenu(null);
  createWindow();
  setupAutoUpdate();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
