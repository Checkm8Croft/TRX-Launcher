const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");

const configPath = path.join(__dirname, "config.json");
let TRXPath = "";
let win;

function loadConfig() {
  try {
    const configRaw = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(configRaw);
    TRXPath = config.TRXPath.replace("%USERPROFILE%", process.env.USERPROFILE);
  } catch (e) {
    TRXPath = "";
  }
}

function saveConfig(trxPath) {
  fs.writeFileSync(configPath, JSON.stringify({ TRXPath: trxPath }, null, 2));
  TRXPath = trxPath;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 700,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile("index.html");
}

app.whenReady().then(() => {
  loadConfig();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ==========================
// LANCIO TRX + GESTIONE MANCANZA
// ==========================
ipcMain.on("launch-game", async (event, game) => {
  const map = {
    "TR1": [],
    "TR1-UB": ["--mod", "tr1-ub"],
    "TR2": ["--mod", "tr2"],
    "TR2-GM": ["--mod", "tr2-gm"],
    "TR3": ["--mod", "tr3"],
    "TR3-LA": ["--mod", "tr3-la"]
  };

  let pathExists = TRXPath && fs.existsSync(TRXPath);
  if (!pathExists) {
    const res = await dialog.showMessageBox(win, {
      type: "warning",
      buttons: ["Cancel", "OK"],
      defaultId: 1,
      cancelId: 0,
      title: "TRX not found",
      message: `TRX not found on ${TRXPath || "<not set>"}`,
      detail: "Select OK for selecting manually the TRX exevutable"
    });

    if (res.response === 0) return; // Cancel

    const filters = [];
    if (process.platform === "win32") filters.push({ name: "TRX Executable", extensions: ["exe"] });
    if (process.platform === "linux") filters.push({ name: "TRX Executable", extensions: [""] });
    if (process.platform === "darwin") filters.push({ name: "TRX App", extensions: ["app"] });

    const fileRes = await dialog.showOpenDialog(win, {
      title: "Select TRX executable",
      properties: ["openFile"],
      filters
    });

    if (fileRes.canceled || !fileRes.filePaths[0]) return;
    saveConfig(fileRes.filePaths[0]);
  }

  // stop audio launcher
  event.sender.send("pause-audio");

  // TRX separato cross-platform
  if (process.platform === "darwin") {
    // apri .app con open
    spawn("open", [TRXPath], { detached: true, stdio: "ignore" }).unref();
  } else {
    spawn(TRXPath, map[game], { detached: true, stdio: 'ignore', shell: true }).unref();
  }
});
