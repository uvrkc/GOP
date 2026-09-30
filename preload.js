const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  showNotification: (title, body, category) => {
    ipcRenderer.send('trigger-native-notification', { title, body, category });
  },
  onPushNotification: (callback) => {
    ipcRenderer.on('push-notification-event', (event, data) => callback(data));
  },
  openExternal: (url) => {
    ipcRenderer.send('open-external-link', url);
  },
  getAppVersion: () => '1.0.0'
});
