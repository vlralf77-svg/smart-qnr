// SmartQnR 관리 프로그램 (Windows exe) — Electron 메인 프로세스
const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('node:path');
const { extractText, convertToSchema } = require('./convert.cjs');

const isDev = !!process.env.ELECTRON_START_URL;

// 업데이트 설치 등 "확인 없이 바로 종료"해야 하는 경우 true 로 설정한다.
let forceQuit = false;

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
  const fs = require('node:fs');
  // 이미 안내한 버전을 기록해 "매 실행마다 반복 알림"을 방지한다.
  const notifiedFile = path.join(app.getPath('userData'), 'update-notified.json');
  const readNotified = () => {
    try {
      return JSON.parse(fs.readFileSync(notifiedFile, 'utf8')).version;
    } catch {
      return null;
    }
  };
  const writeNotified = (v) => {
    try {
      fs.writeFileSync(notifiedFile, JSON.stringify({ version: v }));
    } catch {
      /* 무시 */
    }
  };

  autoUpdater.autoDownload = true;
  // '나중에'를 눌러도 앱을 종료할 때 조용히 설치된다(다음 실행부터 최신).
  autoUpdater.autoInstallOnAppQuit = true;

  // 렌더러(화면)로 업데이트 진행 상태 전송 → "버전 확인 중…" 등 진행 표시
  const sendStatus = (payload) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win && !win.isDestroyed()) win.webContents.send('update:status', payload);
  };
  autoUpdater.on('checking-for-update', () => sendStatus({ state: 'checking' }));
  autoUpdater.on('update-available', (info) =>
    sendStatus({ state: 'available', version: info && info.version }),
  );
  autoUpdater.on('update-not-available', () => sendStatus({ state: 'up-to-date' }));
  autoUpdater.on('download-progress', (p) =>
    sendStatus({ state: 'downloading', percent: p ? Math.round(p.percent) : 0 }),
  );

  autoUpdater.on('update-downloaded', async (info) => {
    sendStatus({ state: 'downloaded', version: info && info.version });
    // 같은 버전은 한 번만 안내(반복 팝업 제거). 안내를 건너뛰어도 종료 시 자동 설치됨.
    if (readNotified() === info.version) return;
    writeNotified(info.version);
    const res = await dialog.showMessageBox({
      type: 'info',
      buttons: ['지금 재시작', '나중에'],
      defaultId: 0,
      title: '업데이트 준비 완료',
      message: `새 버전(${info.version})이 준비되었습니다.`,
      detail:
        "지금 재시작하면 바로 적용됩니다. '나중에'를 선택하면 다음에 앱을 종료할 때 자동으로 설치되며, 이 안내는 다시 표시되지 않습니다.",
    });
    // isSilent=true → 설치 마법사(다음·설치 버튼) 없이 무인 설치,
    // isForceRunAfter=true → 설치 완료 후 앱 자동 재실행
    if (res.response === 0) {
      forceQuit = true; // 종료 확인 창 없이 바로 설치·재시작
      autoUpdater.quitAndInstall(true, true);
    }
  });
  autoUpdater.on('error', (err) => {
    sendStatus({ state: 'error' });
    console.error('[auto-update] ', err == null ? 'unknown' : (err.stack || err).toString());
  });
  // 실행 직후 + 이후 6시간마다 확인
  autoUpdater.checkForUpdates().catch(() => {});
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 6 * 60 * 60 * 1000);
}

// 종료 확인 모달에서 '종료'를 누르면 렌더러가 알려온다 → 실제 종료 진행
ipcMain.on('app:quit-confirmed', () => {
  forceQuit = true;
  const win = BrowserWindow.getAllWindows()[0];
  if (win && !win.isDestroyed()) win.close();
  else app.quit();
});

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

  // 창을 닫을 때(X 버튼·Alt+F4 등) "종료하시겠습니까?" 확인
  //  네이티브 창 대신 렌더러(앱 내부)의 예쁜 커스텀 모달로 확인받는다.
  win.on('close', (e) => {
    if (forceQuit) return; // 업데이트 설치·확인 완료 등은 그대로 종료
    e.preventDefault();
    if (win.webContents && !win.webContents.isDestroyed()) {
      win.webContents.send('app:quit-request'); // 렌더러가 커스텀 모달 표시
      if (win.isMinimized()) win.restore();
      win.focus();
    } else {
      // 렌더러가 없으면(예외) 바로 종료
      forceQuit = true;
      win.close();
    }
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
