// Tipos TypeScript para Electron API

export interface ElectronAPI {
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
  };
  theme: {
    getSystemTheme: () => Promise<'light' | 'dark'>;
    getSystemColorScheme: () => Promise<{ accent: string; theme: 'light' | 'dark' }>;
    onThemeChanged: (callback: (theme: 'light' | 'dark') => void) => void;
  };
  devices: {
    getComputerId: () => Promise<string>;
    getSystemInfo: () => Promise<any>;
  };
  printers: {
    list: () => Promise<any[]>;
    getDefault: () => Promise<string | null>;
    print: (printerName: string, content: string) => Promise<void>;
    test: (printerName: string) => Promise<void>;
    checkStatus: (printerName: string) => Promise<{
      online: boolean;
      paperOk: boolean;
      error?: boolean;
      message?: string;
      printerStatus?: number;
      jobCount?: number;
    }>;
    checkDrivers: () => Promise<any>;
    installDrivers: () => Promise<void>;
    autoRegister: () => Promise<{
      success: boolean;
      printers: any[];
      count: number;
      error?: string;
    }>;
    onPrinterStatusChanged: (callback: (status: any) => void) => void;
  };
  printerDrivers: {
    list: () => Promise<{ drivers: any[]; byBrand: Record<string, any[]> }>;
    get: (driverId: string) => Promise<any>;
    check: (driverId: string) => Promise<{ installed: boolean; driverName?: string; error?: string }>;
    checkMultiple: (driverIds: string[]) => Promise<Record<string, { installed: boolean; driverName: string }>>;
    detectBrand: (printerName: string) => Promise<string | null>;
    download: (driverId: string) => Promise<any>;
    getDownloadProgress: (driverId: string) => Promise<any>;
    onDownloadProgress: (callback: (data: { driverId: string; progress: any }) => void) => void;
    install: (driverId: string, installerPath?: string) => Promise<{ success: boolean; message: string }>;
    installFromFile: () => Promise<{ canceled?: boolean; success?: boolean; message?: string }>;
  };
  scales: {
    list: () => Promise<any[]>;
    connect: (port: string) => Promise<void>;
    read: (port: string) => Promise<string | null>;
    disconnect: (port: string) => Promise<void>;
    checkDrivers: () => Promise<any>;
    installDrivers: () => Promise<void>;
  };
  updater: {
    checkForUpdates: () => Promise<void>;
    restartAndInstall: () => Promise<void>;
    onUpdateChecking: (callback: () => void) => (() => void) | void;
    onUpdateAvailable: (callback: (info: any) => void) => (() => void) | void;
    onUpdateNotAvailable: (callback: (info: any) => void) => (() => void) | void;
    onUpdateError: (callback: (error: string) => void) => (() => void) | void;
    onUpdateProgress: (callback: (progress: any) => void) => (() => void) | void;
    onUpdateDownloaded: (callback: (info: any) => void) => (() => void) | void;
    onUpdateReadyToInstall?: (callback: (data: any) => void) => (() => void) | void;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

