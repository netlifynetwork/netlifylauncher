const { contextBridge, shell } = require("electron");
contextBridge.exposeInMainWorld("netlify", {
  openExternal: (url) => shell.openExternal(url)
});
