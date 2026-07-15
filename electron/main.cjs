// SmartQnR 관리 프로그램 (Windows exe) — Electron 메인 프로세스
const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('node:path');
const { extractText, convertToSchema } = require('./convert.cjs');

const isDev = !!process.env.ELECTRON_START_URL;

// 문서 → 문진 변환 IPC (§6): 파일 바이트 + API 키 → 스키마 JSON 문자열
ipcMain.handle('convert:document', async (_event, payload) => {
  const { fileName, data, apiKey } = payload || {};
  const buffer = Buffer.from(data); // data: ArrayBuffer/Uint8Array from renderer
  const { rawText, layoutHints } = await extractText(buffer, fileName);
  const schemaText = await convertToSchema({ rawText, layoutHints, apiKey });
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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
