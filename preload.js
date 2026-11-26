const { contextBridge, shell, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("netlify", {
  openExternal: (url) => shell.openExternal(url),
  window: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    maximize: () => ipcRenderer.invoke("window:maximize"),
    close: () => ipcRenderer.invoke("window:close")
  },
  minecraft: {
    versions: snapshots => ipcRenderer.invoke("minecraft:versions", !!snapshots),
    instances: () => ipcRenderer.invoke("minecraft:instances:list"),
    createInstance: input => ipcRenderer.invoke("minecraft:instance:create", input),
    login: () => ipcRenderer.invoke("minecraft:login"),
    profile: () => ipcRenderer.invoke("minecraft:profile"),
    logout: () => ipcRenderer.invoke("minecraft:logout"),
    launch: id => ipcRenderer.invoke("minecraft:launch", id),
    on: (channel, callback) => {
      const allowed=["minecraft:status","minecraft:progress","minecraft:started","minecraft:closed","minecraft:log"];
      if(!allowed.includes(channel)) return () => {};
      const listener=(_event,payload)=>callback(payload); ipcRenderer.on(channel,listener);
      return () => ipcRenderer.removeListener(channel,listener);
    }
  },
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
