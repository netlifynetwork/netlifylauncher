const { contextBridge, shell, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("netlify", {
  openExternal: (url) => shell.openExternal(url),
  updater: {
    check: () => ipcRenderer.invoke("updater:check"),
    download: () => ipcRenderer.invoke("updater:download"),
    install: () => ipcRenderer.invoke("updater:install"),
    snooze: () => ipcRenderer.invoke("updater:snooze"),
    on: (channel, callback) => {
      const allowed = ["updater:checking", "updater:available", "updater:not-available", "updater:progress", "updater:downloaded", "updater:error"];
      if (!allowed.includes(channel)) return () => {};
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    }
  }
});
