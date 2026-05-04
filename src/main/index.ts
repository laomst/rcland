import { app, BrowserWindow, Menu, shell } from 'electron'
import { join } from 'path'
import { platform } from 'os'
import { readFileSync, writeFileSync } from 'fs'
import { registerIpcHandlers } from './ipc'

const isDev = !app.isPackaged

interface WindowState {
  x?: number
  y?: number
  width: number
  height: number
  isMaximized?: boolean
}

const stateFile = join(app.getPath('userData'), 'window-state.json')

function loadWindowState(): WindowState {
  try {
    return JSON.parse(readFileSync(stateFile, 'utf-8'))
  } catch {
    return { width: 1200, height: 800 }
  }
}

function saveWindowState(win: BrowserWindow): void {
  const bounds = win.getBounds()
  const state: WindowState = {
    ...bounds,
    isMaximized: win.isMaximized()
  }
  try {
    writeFileSync(stateFile, JSON.stringify(state))
  } catch { /* ignore */ }
}

function createWindow(): void {
  const saved = loadWindowState()

  const mainWindow = new BrowserWindow({
    width: saved.width,
    height: saved.height,
    ...(saved.x !== undefined && saved.y !== undefined ? { x: saved.x, y: saved.y } : {}),
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

  if (saved.isMaximized) {
    mainWindow.maximize()
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('close', () => {
    saveWindowState(mainWindow)
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

  // Set application menu
  // Edit menu is required on macOS for standard shortcuts (Cmd+C/V/X/A/Z) to work
  const isMac = platform() === 'darwin'
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{
      label: 'RCLand',
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const }
      ]
    }] : []),
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
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))

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
