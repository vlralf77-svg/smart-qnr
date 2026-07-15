// 렌더러에 안전하게 노출할 API (현재는 앱 정보 정도만)
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('smartqnr', {
  isElectron: true,
  platform: process.platform,
});
