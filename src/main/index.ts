import { app, BrowserWindow, Menu, shell } from 'electron'
import { join } from 'path'
import { platform } from 'os'
import { registerIpcHandlers } from './ipc'

const isDev = !app.isPackaged

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'RCLand',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    // In production, renderer files are in extraResources (outside asar)
    const rendererPath = isDev
      ? join(__dirname, '../renderer/index.html')
      : join(process.resourcesPath, 'renderer/index.html')
    mainWindow.loadFile(rendererPath)
  }
}

app.whenReady().then(() => {
  if (platform() === 'win32') {
    app.setAppUserModelId('com.rcland.app')
  }

  // Register all IPC handlers before creating window
  registerIpcHandlers()

  // Set minimal application menu (View > Reload only)
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' }
      ]
    }
  ]))

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (platform() !== 'darwin') {
    app.quit()
  }
})
