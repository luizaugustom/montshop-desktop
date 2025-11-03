import { contextBridge, ipcRenderer } from 'electron';

// Expor APIs protegidas para o renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Controles de janela
  window: {
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    close: () => ipcRenderer.invoke('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  },

  // Tema do sistema
  theme: {
    getSystemTheme: () => ipcRenderer.invoke('get-system-theme'),
    getSystemColorScheme: () => ipcRenderer.invoke('get-system-color-scheme'),
    onThemeChanged: (callback: (theme: 'light' | 'dark') => void) => {
      ipcRenderer.on('theme-changed', (_event, theme) => callback(theme));
    },
  },

  // Dispositivos
  devices: {
    getComputerId: () => ipcRenderer.invoke('get-computer-id'),
    getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  },

  // Impressoras
  printers: {
    list: () => ipcRenderer.invoke('printers-list'),
    getDefault: () => ipcRenderer.invoke('printers-get-default'),
    print: (printerName: string, content: string) =>
      ipcRenderer.invoke('printers-print', printerName, content),
    test: (printerName: string) => ipcRenderer.invoke('printers-test', printerName),
    checkStatus: (printerName: string) => ipcRenderer.invoke('printers-check-status', printerName),
    checkDrivers: () => ipcRenderer.invoke('printers-check-drivers'),
    installDrivers: () => ipcRenderer.invoke('printers-install-drivers'),
    onPrinterStatusChanged: (callback: (status: any) => void) => {
      ipcRenderer.on('printer-status-changed', (_event, status) => callback(status));
    },
  },

  // Drivers de Impressora
  printerDrivers: {
    list: () => ipcRenderer.invoke('printer-drivers-list'),
    get: (driverId: string) => ipcRenderer.invoke('printer-drivers-get', driverId),
    check: (driverId: string) => ipcRenderer.invoke('printer-drivers-check', driverId),
    checkMultiple: (driverIds: string[]) => ipcRenderer.invoke('printer-drivers-check-multiple', driverIds),
    detectBrand: (printerName: string) => ipcRenderer.invoke('printer-drivers-detect-brand', printerName),
    download: (driverId: string) => ipcRenderer.invoke('printer-drivers-download', driverId),
    getDownloadProgress: (driverId: string) => ipcRenderer.invoke('printer-drivers-download-progress', driverId),
    onDownloadProgress: (callback: (data: { driverId: string; progress: any }) => void) => {
      ipcRenderer.on('driver-download-progress', (_event, data) => callback(data));
    },
    install: (driverId: string, installerPath?: string) => ipcRenderer.invoke('printer-drivers-install', driverId, installerPath),
    installFromFile: () => ipcRenderer.invoke('printer-drivers-install-from-file'),
  },

  // Balanças
  scales: {
    list: () => ipcRenderer.invoke('scales-list'),
    connect: (port: string) => ipcRenderer.invoke('scales-connect', port),
    read: (port: string) => ipcRenderer.invoke('scales-read', port),
    disconnect: (port: string) => ipcRenderer.invoke('scales-disconnect', port),
    checkDrivers: () => ipcRenderer.invoke('scales-check-drivers'),
    installDrivers: () => ipcRenderer.invoke('scales-install-drivers'),
  },

  // Atualizações
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    restartAndInstall: () => ipcRenderer.invoke('restart-and-install-update'),
    onUpdateChecking: (callback: () => void) => {
      ipcRenderer.on('update-checking', () => callback());
    },
    onUpdateAvailable: (callback: (info: any) => void) => {
      ipcRenderer.on('update-available', (_event, info) => callback(info));
    },
    onUpdateNotAvailable: (callback: (info: any) => void) => {
      ipcRenderer.on('update-not-available', (_event, info) => callback(info));
    },
    onUpdateError: (callback: (error: string) => void) => {
      ipcRenderer.on('update-error', (_event, error) => callback(error));
    },
    onUpdateProgress: (callback: (progress: any) => void) => {
      ipcRenderer.on('update-progress', (_event, progress) => callback(progress));
    },
    onUpdateDownloaded: (callback: (info: any) => void) => {
      ipcRenderer.on('update-downloaded', (_event, info) => callback(info));
    },
    onUpdateReadyToInstall: (callback: (data: any) => void) => {
      ipcRenderer.on('update-ready-to-install', (_event, data) => callback(data));
    },
  },
});

// Types são declarados em src/types/electron.d.ts

