const { app, BrowserWindow, shell, ipcMain, safeStorage } = require("electron");
const fs = require("fs/promises");
const { createWriteStream } = require("fs");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");
const extractZip = require("extract-zip");
const { randomUUID } = require("crypto");
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


let activeXbox = null, activeMinecraft = null, activeGame = null;
const dataFile = name => path.join(app.getPath("userData"), name);
const instanceFile = () => dataFile("instances.json");
async function readInstances() { try { return JSON.parse(await fs.readFile(instanceFile(), "utf8")); } catch { return []; } }
async function writeInstances(items) { await fs.mkdir(path.dirname(instanceFile()), {recursive:true}); await fs.writeFile(instanceFile(), JSON.stringify(items,null,2)); }
async function saveXbox(xbox, minecraft) {
  activeXbox=xbox; activeMinecraft=minecraft;
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted=safeStorage.encryptString(xbox.save()).toString("base64");
    await fs.writeFile(dataFile("account.json"), JSON.stringify({encrypted}));
  }
}
async function getSession() {
  if (activeXbox && activeMinecraft) {
    try { if (activeMinecraft.validate()) return {xbox:activeXbox,minecraft:activeMinecraft}; await activeXbox.refresh(); activeMinecraft=await activeXbox.getMinecraft(); return {xbox:activeXbox,minecraft:activeMinecraft}; } catch { activeXbox=null; activeMinecraft=null; }
  }
  try {
    const saved=JSON.parse(await fs.readFile(dataFile("account.json"),"utf8"));
    if (!saved.encrypted || !safeStorage.isEncryptionAvailable()) return null;
    const {Auth}=require("msmc");
    activeXbox=await new Auth("select_account").refresh(safeStorage.decryptString(Buffer.from(saved.encrypted,"base64")));
    activeMinecraft=await activeXbox.getMinecraft();
    return {xbox:activeXbox,minecraft:activeMinecraft};
  } catch { return null; }
}

async function findJavaExecutable(dir, depth=0) {
  if (depth>5) return null;
  let entries;
  try { entries=await fs.readdir(dir,{withFileTypes:true}); } catch { return null; }
  for (const entry of entries) {
    const full=path.join(dir,entry.name);
    if (entry.isFile() && entry.name.toLowerCase()==="java.exe") return full;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const found=await findJavaExecutable(path.join(dir,entry.name),depth+1);
      if(found)return found;
    }
  }
  return null;
}
async function ensureJavaForVersion(versionId) {
  const manifestResponse=await fetch("https://launchermeta.mojang.com/mc/game/version_manifest_v2.json");
  if(!manifestResponse.ok)throw new Error("Could not read official Minecraft version manifest.");
  const manifest=await manifestResponse.json();
  const versionEntry=manifest.versions.find(v=>v.id===versionId);
  if(!versionEntry)throw new Error("Minecraft version "+versionId+" was not found in Mojang's manifest.");
  const metadataResponse=await fetch(versionEntry.url);
  if(!metadataResponse.ok)throw new Error("Could not read Minecraft version metadata.");
  const metadata=await metadataResponse.json();
  const major=Number(metadata.javaVersion?.majorVersion||21);
  const runtimeRoot=dataFile(path.join("java-runtime","temurin-"+major));
  const existing=await findJavaExecutable(runtimeRoot);
  if(existing)return existing;
  send("minecraft:progress",{stage:"runtime",percent:0,message:"Installing Java "+major+" runtime…"});
  await fs.mkdir(runtimeRoot,{recursive:true});
  const archive=dataFile(path.join("java-runtime","temurin-"+major+".zip"));
  const url="https://api.adoptium.net/v3/binary/latest/"+major+"/ga/windows/x64/jre/hotspot/normal/eclipse";
  const response=await fetch(url,{redirect:"follow"});
  if(!response.ok||!response.body)throw new Error("Java "+major+" runtime download failed ("+response.status+").");
  await pipeline(Readable.fromWeb(response.body),createWriteStream(archive));
  send("minecraft:progress",{stage:"runtime",percent:100,message:"Extracting Java "+major+" runtime…"});
  await extractZip(archive,{dir:runtimeRoot});
  await fs.unlink(archive).catch(()=>{});
  const javaPath=await findJavaExecutable(runtimeRoot);
  if(!javaPath)throw new Error("The downloaded Java runtime did not contain java.exe.");
  return javaPath;
}

function registerMinecraftHandlers() {
  ipcMain.handle("minecraft:versions", async (_e, snapshots=false) => {
    const r=await fetch("https://launchermeta.mojang.com/mc/game/version_manifest_v2.json");
    if(!r.ok) throw new Error("Minecraft version list request failed: "+r.status);
    const m=await r.json();
    return {latest:m.latest,versions:m.versions.filter(v=>snapshots||v.type==="release").slice(0,350).map(v=>({id:v.id,type:v.type,releaseTime:v.releaseTime}))};
  });
  ipcMain.handle("minecraft:instances:list", async()=>readInstances());
  ipcMain.handle("minecraft:instance:create", async(_e,input)=>{
    const name=String(input?.name||"").trim().slice(0,48)||"Minecraft";
    const version=String(input?.version||"").trim();
    if(!/^[A-Za-z0-9._-]{1,40}$/.test(version)) throw new Error("Choose a valid Minecraft version.");
    const loader=["Vanilla","Fabric","Forge","NeoForge","Quilt"].includes(input?.loader)?input.loader:"Vanilla";
    const type=input?.versionType==="snapshot"?"snapshot":"release";
    const list=await readInstances();
    const item={id:randomUUID(),name,version,versionType:type,loader,createdAt:new Date().toISOString(),gameDir:dataFile(path.join("minecraft","instances",randomUUID()))};
    item.gameDir=dataFile(path.join("minecraft","instances",item.id));
    list.push(item); await writeInstances(list); return item;
  });
  ipcMain.handle("minecraft:login",async()=>{
    try {
      send("minecraft:status",{stage:"auth",message:"Opening Microsoft sign-in…"});
      const {Auth}=require("msmc");
      const xbox=await new Auth("select_account").launch("electron",{width:620,height:760,resizable:true});
      send("minecraft:status",{stage:"auth",message:"Checking Minecraft ownership…"});
      const minecraft=await xbox.getMinecraft();
      const entitlements=await minecraft.entitlements();
      if(!entitlements.includes("game_minecraft")&&!entitlements.includes("product_minecraft")&&!minecraft.isDemo()) throw new Error("This account does not have a Minecraft Java Edition entitlement. Sign in with the Microsoft account that owns Minecraft Java Edition.");
      await saveXbox(xbox,minecraft);
      send("minecraft:status",{stage:"ready",message:"Signed in as "+minecraft.profile.name});
      return {ok:true,profile:{name:minecraft.profile.name,id:minecraft.profile.id},demo:minecraft.isDemo()};
    } catch(error) { send("minecraft:status",{stage:"error",message:error.message||String(error)}); return {ok:false,message:error.message||String(error)}; }
  });
  ipcMain.handle("minecraft:profile",async()=>{
    const s=await getSession(); return s?{signedIn:true,profile:{name:s.minecraft.profile.name,id:s.minecraft.profile.id}}:{signedIn:false};
  });
  ipcMain.handle("minecraft:logout",async()=>{
    activeXbox=null;activeMinecraft=null;try{await fs.unlink(dataFile("account.json"));}catch{}return {ok:true};
  });
  ipcMain.handle("minecraft:launch",async(_e,id)=>{
    if(activeGame)return {ok:false,message:"Minecraft is already running."};
    const instance=(await readInstances()).find(x=>x.id===id);
    if(!instance)return {ok:false,message:"Instance not found."};
    if(instance.loader!=="Vanilla")return {ok:false,message:instance.loader+" installation is not wired into the game installer yet. Choose Vanilla for a working first launch."};
    const session=await getSession();
    if(!session)return {ok:false,needsLogin:true,message:"Sign in with Microsoft first."};
    try {
      const javaPath=await ensureJavaForVersion(instance.version);
      const {Client}=require("minecraft-launcher-core");
      const client=new Client();
      send("minecraft:progress",{stage:"prepare",percent:0,message:"Preparing Minecraft "+instance.version+"…"});
      client.on("progress",p=>send("minecraft:progress",{stage:"download",percent:Number(p?.percent??p?.progress??0),message:"Downloading game files…"}));
      client.on("download-status",p=>send("minecraft:progress",{stage:"download",percent:Number(p?.percent??p?.progress??0),message:"Downloading game files…"}));
      client.on("debug",msg=>send("minecraft:log",{message:String(msg).slice(0,800)}));
      client.on("data",msg=>send("minecraft:log",{message:String(msg).slice(0,800)}));
      client.on("error",error=>{activeGame=null;send("minecraft:status",{stage:"error",message:error?.message||String(error)});});
      client.on("close",code=>{activeGame=null;send("minecraft:closed",{code:Number(code??0)});});
      const child=await client.launch({authorization:session.minecraft.mclc(),root:instance.gameDir,version:{number:instance.version,type:instance.versionType||"release"},javaPath,memory:{min:"1G",max:"4G"}});
      activeGame=child||client;
      if(child?.once)child.once("close",code=>{activeGame=null;send("minecraft:closed",{code:Number(code??0)});});
      send("minecraft:started",{name:instance.name,version:instance.version});return {ok:true};
    } catch(error) {activeGame=null;send("minecraft:status",{stage:"error",message:error.message||String(error)});return {ok:false,message:error.message||String(error)};}
  });
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
  registerMinecraftHandlers();
  createWindow();
  configureUpdater();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
