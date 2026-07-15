// 렌더러에 안전하게 노출할 API
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('smartqnr', {
  isElectron: true,
  platform: process.platform,
  // 문서 → 문진 변환. payload: { fileName, data(ArrayBuffer), apiKey }
  // 반환: { schemaText, rawText }
  convertDocument: (payload) => ipcRenderer.invoke('convert:document', payload),
});
