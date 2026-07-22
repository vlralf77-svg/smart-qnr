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
});
