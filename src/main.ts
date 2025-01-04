import { app, BrowserWindow, desktopCapturer, ipcMain } from 'electron';
import path from 'path';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Force Linux platform behavior
app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.commandLine.appendSwitch('force-renderer-accessibility');

// Enable screen capture on Linux
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer');
  app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
}

// Override platform check
Object.defineProperty(process, 'platform', {
  get() {
    return 'linux';
  }
});

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    title: 'Gather | A better way to meet',
    icon: path.join(__dirname, '../gather-logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // and load Gather.town
  mainWindow.loadURL("https://app.gather.town", {
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  });

  // Handle new window creation (for OAuth popups)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://gather.town') || url.includes('accounts.google.com')) {
      return { action: 'allow' };
    }
    return { action: 'deny' };
  });
};

// This method will be called when Electron has finished initialization
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle screen capture
ipcMain.handle("DESKTOP_CAPTURER_GET_SOURCES", async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["window", "screen"],
      thumbnailSize: {
        width: 150,
        height: 150
      }
    });

    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnail_data: source.thumbnail.toDataURL(),
    }));
  } catch (e) {
    console.error(e);
    return [];
  }
});

// Dev tools toggle
ipcMain.handle('TOGGLE_DEV_TOOLS', () => {
  mainWindow?.webContents.toggleDevTools();
});
