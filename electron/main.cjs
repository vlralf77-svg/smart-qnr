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

  autoUpdater.on('update-downloaded', (info) => {
    sendStatus({ state: 'downloaded', version: info && info.version });
    // 같은 버전은 한 번만 안내(반복 팝업 제거). 안내를 건너뛰어도 종료 시 자동 설치됨.
    if (readNotified() === (info && info.version)) return;
    writeNotified(info && info.version);
    // 네이티브 창 대신 렌더러(앱 내부)의 커스텀 모달로 안내 → '지금 재시작' 선택 시 설치
    sendStatus({ state: 'ready', version: info && info.version });
  });

  // 업데이트 준비 모달에서 '지금 재시작'을 누르면 렌더러가 알려온다 → 설치·재시작
  //  isSilent=true(무인 설치), isForceRunAfter=true(설치 후 자동 재실행)
  ipcMain.on('update:restart-now', () => {
    forceQuit = true; // 종료 확인 창 없이 바로 설치·재시작
    autoUpdater.quitAndInstall(true, true);
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

// 문진 엑셀 템플릿 저장 — 앱에 동봉된 템플릿을 사용자가 고른 위치에 저장(네이티브 저장창).
//  브라우저(file://)의 fetch/다운로드 제약을 피해 설치본에서도 확실히 동작한다.
ipcMain.handle('template:save', async () => {
  const fs = require('node:fs');
  const NAME = '문진업로드템플릿.xlsx';
  const candidates = [
    path.join(__dirname, '..', 'dist', 'templates', NAME), // 패키징(빌드) 결과
    path.join(__dirname, '..', 'public', 'templates', NAME), // dev 실행
  ];
  const src = candidates.find((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  });
  if (!src) return { ok: false, error: '템플릿 파일을 찾을 수 없습니다.' };
  try {
    const data = fs.readFileSync(src);
    const win = BrowserWindow.getAllWindows()[0];
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: '문진 템플릿 저장',
      defaultPath: NAME,
      filters: [{ name: 'Excel 통합 문서', extensions: ['xlsx'] }],
    });
    if (canceled || !filePath) return { ok: false, canceled: true };
    fs.writeFileSync(filePath, data);
    return { ok: true, filePath };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
});

// EMR/외부 API 호출 — 메인 프로세스에서 실행해 브라우저 CORS 제약을 피한다.
ipcMain.handle('emr:fetch', async (_event, req) => {
  const { url, method, headers, body } = req || {};
  try {
    const res = await fetch(url, {
      method: method || 'GET',
      headers: headers || {},
      body: method === 'POST' ? body : undefined,
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, error: String((e && e.message) || e) };
  }
});

// 표시 모드(PC/모바일)에 따라 창 최소 크기를 조절 — 모바일 모드면 좁게 줄일 수 있게.
ipcMain.on('display:mode', (_event, mode) => {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win || win.isDestroyed()) return;
  const [w, h] = win.getSize();
  if (mode === 'mobile') {
    win.setMinimumSize(360, 600); // 모바일처럼 좁게 축소 허용
    if (win.isMaximized()) win.unmaximize(); // 최대화 상태면 먼저 해제해야 축소됨
    if (w > 500) win.setSize(430, Math.max(h, 780)); // 선택 즉시 모바일 폭으로
  } else {
    win.setMinimumSize(1024, 700); // PC/자동은 기존 최소 크기
    if (w < 1024) win.setSize(1024, Math.max(h, 700));
  }
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
    width: 1600,
    height: 1000,
    minWidth: 1024,
    minHeight: 700,
    center: true,
    // 콘텐츠가 처음 그려지기 전에는 창을 숨겨 검은 프레임(잔상) 번쩍임 방지
    show: false,
    backgroundColor: '#f2f6f4', // 앱 배경과 동일 톤(첫 페인트 전 바탕색)
    title: 'SmartQnR 문진관리',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 첫 실행 시 화면을 넉넉히 — 숨긴 상태에서 최대화해 두고, 첫 렌더가 끝나면 표시
  try {
    win.maximize();
  } catch {
    /* 무시 */
  }
  win.once('ready-to-show', () => {
    win.show();
    win.focus();
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

// 중복 실행 방지 — 이미 실행 중이면 두 번째 인스턴스는 즉시 종료하고,
//  대신 기존 창을 앞으로 가져와 활성화한다(한 개만 켜져 있게).
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    // 기본 메뉴 최소화(관리 프로그램용)
    Menu.setApplicationMenu(null);
    createWindow();
    setupAutoUpdate();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
