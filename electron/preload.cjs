const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('lojasCloudDesktop', {
  isDesktop: true,
  platform: process.platform,
  // Baixa a versão mais recente do site (Vercel) e reinicia o app
  forceUpdate: () => ipcRenderer.invoke('lc:force-update'),
  getInfo: () => ipcRenderer.invoke('lc:info'),
});
