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
    autoRegister: () => ipcRenderer.invoke('printers-auto-register'),
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
      const handler = () => callback();
      ipcRenderer.on('update-checking', handler);
      // Retornar função de cleanup
      return () => ipcRenderer.removeListener('update-checking', handler);
    },
    onUpdateAvailable: (callback: (info: any) => void) => {
      const handler = (_event: any, info: any) => callback(info);
      ipcRenderer.on('update-available', handler);
      // Retornar função de cleanup
      return () => ipcRenderer.removeListener('update-available', handler);
    },
    onUpdateNotAvailable: (callback: (info: any) => void) => {
      const handler = (_event: any, info: any) => callback(info);
      ipcRenderer.on('update-not-available', handler);
      // Retornar função de cleanup
      return () => ipcRenderer.removeListener('update-not-available', handler);
    },
    onUpdateError: (callback: (error: string) => void) => {
      const handler = (_event: any, error: string) => callback(error);
      ipcRenderer.on('update-error', handler);
      // Retornar função de cleanup
      return () => ipcRenderer.removeListener('update-error', handler);
    },
    onUpdateProgress: (callback: (progress: any) => void) => {
      const handler = (_event: any, progress: any) => callback(progress);
      ipcRenderer.on('update-progress', handler);
      // Retornar função de cleanup
      return () => ipcRenderer.removeListener('update-progress', handler);
    },
    onUpdateDownloaded: (callback: (info: any) => void) => {
      const handler = (_event: any, info: any) => callback(info);
      ipcRenderer.on('update-downloaded', handler);
      // Retornar função de cleanup
      return () => ipcRenderer.removeListener('update-downloaded', handler);
    },
    onUpdateReadyToInstall: (callback: (data: any) => void) => {
      const handler = (_event: any, data: any) => callback(data);
      ipcRenderer.on('update-ready-to-install', handler);
      // Retornar função de cleanup
      return () => ipcRenderer.removeListener('update-ready-to-install', handler);
    },
  },
});

// Types são declarados em src/types/electron.d.ts

