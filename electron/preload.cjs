// 렌더러에 안전하게 노출할 API
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('smartqnr', {
  isElectron: true,
  platform: process.platform,
  // 문서 → 문진 변환(로컬 규칙 기반, 외부 API 미사용). payload: { fileName, data(ArrayBuffer) }
  // 반환: { schemaText, rawText }
  convertDocument: (payload) => ipcRenderer.invoke('convert:document', payload),
  // 자동 업데이트 진행 상태 구독. callback({ state, version?, percent? })
  //  state: 'checking' | 'available' | 'downloading' | 'downloaded' | 'up-to-date' | 'error'
  //  구독 해제 함수를 반환한다.
  onUpdateStatus: (callback) => {
    const listener = (_e, payload) => callback(payload);
    ipcRenderer.on('update:status', listener);
    return () => ipcRenderer.removeListener('update:status', listener);
  },
  // 종료 확인: 창을 닫으려 하면 main 이 알려온다(커스텀 모달 표시용). 해제 함수 반환.
  onQuitRequest: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('app:quit-request', listener);
    return () => ipcRenderer.removeListener('app:quit-request', listener);
  },
  // 모달에서 '종료'를 누르면 호출 → 실제 종료 진행
  confirmQuit: () => ipcRenderer.send('app:quit-confirmed'),
  // 업데이트 준비 모달에서 '지금 재시작' 선택 시 호출 → 설치·재시작
  restartForUpdate: () => ipcRenderer.send('update:restart-now'),
  // 문진 엑셀 템플릿을 네이티브 저장창으로 저장. { ok, canceled?, filePath?, error? }
  saveTemplate: () => ipcRenderer.invoke('template:save'),
});
