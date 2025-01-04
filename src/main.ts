import { app, BrowserWindow, desktopCapturer, ipcMain, session } from 'electron';
import path from 'path';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    title: 'Gather | A better way to meet',
    icon: path.join(__dirname, '../gather-logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  // Set permissions for media
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = [
      'media',
      'display-capture',
      'mediaKeySystem',
      'geolocation',
      'notifications',
      'fullscreen',
      'clipboard-read',
      'clipboard-write'
    ];
    
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Enable persistent cookies
  session.defaultSession.cookies.set({
    url: 'https://gather.town',
    name: 'gather-session',
    domain: '.gather.town',
    path: '/',
    secure: true,
    httpOnly: true,
    expirationDate: Date.now() / 1000 + (365 * 24 * 60 * 60) // 1 year from now in seconds
  });

  // and load Gather.town
  mainWindow.loadURL("https://app.gather.town", {
    httpReferrer: {
      url: "https://gather.town/",
      policy: "same-origin"
    },
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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

ipcMain.handle("DESKTOP_CAPTURER_GET_SOURCES", async (event, opts) => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["window", "screen"],
    });

    return sources.map((source) => ({
      ...source,
      thumbnail_data: source.thumbnail.toDataURL(),
    }));
  } catch (e) {
    console.error(e);
  }
});
