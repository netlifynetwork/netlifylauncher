const { app, BrowserWindow, shell, ipcMain } = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");

let mainWindow;
let updateSnoozeTimer = null;

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1536, height: 900, minWidth: 1120, minHeight: 700,
    backgroundColor: "#09080b",
    title: "Netlify MC",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile("index.html");
  ipcMain.removeHandler("window:minimize");
  ipcMain.removeHandler("window:maximize");
  ipcMain.removeHandler("window:close");
  ipcMain.handle("window:minimize", () => { mainWindow?.minimize(); return { ok: true }; });
  ipcMain.handle("window:maximize", () => { if (mainWindow) mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize(); return { ok: true }; });
  ipcMain.handle("window:close", () => { mainWindow?.close(); return { ok: true }; });
  mainWindow.on("closed", () => { mainWindow = null; });
}

function configureUpdater() {
  if (!app.isPackaged) return;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = true;
  autoUpdater.allowDowngrade = false;

  autoUpdater.on("checking-for-update", () => send("updater:checking"));
  autoUpdater.on("update-available", info => send("updater:available", {
    version: info.version,
    releaseName: info.releaseName || "Netlify MC update",
    releaseNotes: typeof info.releaseNotes === "string" ? info.releaseNotes : ""
  }));
  autoUpdater.on("update-not-available", info => send("updater:not-available", { version: info.version }));
  autoUpdater.on("download-progress", progress => send("updater:progress", {
    percent: Math.round(progress.percent),
    transferred: progress.transferred,
    total: progress.total
  }));
  autoUpdater.on("update-downloaded", info => send("updater:downloaded", { version: info.version }));
  autoUpdater.on("error", error => send("updater:error", { message: error.message }));

  ipcMain.handle("updater:check", async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { ok: true, version: result?.updateInfo?.version || null };
    } catch (error) {
      send("updater:error", { message: error.message });
      return { ok: false, message: error.message };
    }
  });
  ipcMain.handle("updater:download", async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { ok: true };
    } catch (error) {
      send("updater:error", { message: error.message });
      return { ok: false, message: error.message };
    }
  });
  ipcMain.handle("updater:install", () => {
    setImmediate(() => autoUpdater.quitAndInstall());
    return { ok: true };
  });
  ipcMain.handle("updater:snooze", () => {
    if (updateSnoozeTimer) clearTimeout(updateSnoozeTimer);
    updateSnoozeTimer = setTimeout(() => {
      updateSnoozeTimer = null;
      autoUpdater.checkForUpdates().catch(error => send("updater:error", { message: error.message }));
    }, 30 * 60 * 1000);
    return { ok: true, minutes: 30 };
  });

  setTimeout(() => autoUpdater.checkForUpdates().catch(error => send("updater:error", { message: error.message })), 12000);
  setInterval(() => autoUpdater.checkForUpdates().catch(error => send("updater:error", { message: error.message })), 6 * 60 * 60 * 1000);
}

app.whenReady().then(() => {
  createWindow();
  configureUpdater();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
