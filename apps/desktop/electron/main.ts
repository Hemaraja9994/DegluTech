import { app, BrowserWindow } from 'electron';
import * as path from 'path';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 390,
    minHeight: 680,
    backgroundColor: '#eef5f7',
    title: 'DegluTech',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const devServerUrl = process.env.ELECTRON_START_URL;

  if (!app.isPackaged && devServerUrl) {
    win.loadURL(devServerUrl);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
