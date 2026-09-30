const { app, BrowserWindow, Notification, ipcMain, shell, Tray, Menu } = require('electron');
const path = require('path');
const { startServer, PORT } = require('./server/server');

let mainWindow = null;
let tray = null;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'Team Operations Hub',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  const appUrl = `http://localhost:${PORT}`;
  mainWindow.loadURL(appUrl);

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      if (Notification.isSupported()) {
        new Notification({
          title: 'Team Operations Hub',
          body: 'App minimized to system tray. You will still receive team notifications.'
        }).show();
      }
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function createTray() {
  try {
    // Basic tray menu
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open Team Operations Hub',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      {
        label: 'Sync Time Bookings',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.webContents.send('trigger-sync');
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);

    // Use icon if available or fallback
    // tray = new Tray(path.join(__dirname, 'src/assets/icon.png'));
    // tray.setToolTip('Team Operations Hub');
    // tray.setContextMenu(contextMenu);
  } catch (err) {
    console.log('Tray setup skipped or icon not found:', err.message);
  }
}

// IPC Handlers
ipcMain.on('trigger-native-notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: title || 'Team Notification',
      body: body || '',
      urgency: 'critical',
      silent: false
    });

    notification.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
    });

    notification.show();
  }
});

ipcMain.on('open-external-link', (event, url) => {
  if (url) {
    shell.openExternal(url);
  }
});

app.whenReady().then(() => {
  // Start local micro-server first, then open window
  startServer((port) => {
    createWindow();
    createTray();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep running in background tray unless explicitly quit
    if (isQuitting) {
      app.quit();
    }
  }
});
