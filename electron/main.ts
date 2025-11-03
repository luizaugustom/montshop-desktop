import { app, BrowserWindow, ipcMain, nativeTheme, systemPreferences } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import * as path from 'path';
import * as fs from 'fs';
import { registerDeviceHandlers } from './handlers/device-handlers';
import { registerPrinterHandlers } from './handlers/printer-handlers';
import { registerScaleHandlers } from './handlers/scale-handlers';
import { registerPrinterDriverHandlers } from './handlers/printer-driver-handlers';

// Configurar log
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
log.info('Aplicação iniciando...');

let mainWindow: BrowserWindow | null = null;

// Detectar ambiente de desenvolvimento
// Em produção (empacotado), app.isPackaged será true
// Em desenvolvimento, NODE_ENV pode ser 'development' ou app.isPackaged será false
const isDev = process.env.NODE_ENV === 'development' || (!app.isPackaged && process.env.ELECTRON_IS_DEV !== '0');

// Configurar auto-updater (apenas em produção)
if (!isDev) {
  try {
    autoUpdater.logger = log;
    
    // Configurar atualizações automáticas
    autoUpdater.autoDownload = true; // Baixar automaticamente quando disponível
    autoUpdater.autoInstallOnAppQuit = true; // Instalar automaticamente ao fechar o app
    
    // Verificar atualizações ao iniciar
    autoUpdater.checkForUpdatesAndNotify();
    
    // Verificar atualizações periodicamente (a cada 4 horas)
    setInterval(() => {
      log.info('Verificando atualizações periodicamente...');
      autoUpdater.checkForUpdates();
    }, 4 * 60 * 60 * 1000); // 4 horas em milissegundos
    
    log.info('Auto-updater configurado: download automático e instalação ao fechar');
  } catch (error) {
    log.warn('Erro ao configurar auto-updater:', error);
  }
}

// Função para encontrar o index.html em produção
function findIndexHtml(): string {
  // app.getAppPath() retorna o caminho correto tanto em dev quanto em produção (incluindo dentro do asar)
  const appPath = app.getAppPath();
  const indexPath = path.join(appPath, 'dist', 'index.html');
  
  log.info('App path:', appPath);
  log.info('Tentando carregar index.html de:', indexPath);
  
  // Verificar se o arquivo existe (pode falhar para asar, mas loadFile funciona)
  try {
    // Para asar, não conseguimos usar existsSync, mas loadFile funciona
    if (!appPath.includes('.asar')) {
      if (fs.existsSync(indexPath)) {
        log.info('Index.html encontrado em:', indexPath);
        return indexPath;
      }
    } else {
      // Está dentro do asar, loadFile vai funcionar mesmo sem existsSync
      log.info('App está empacotado (asar), usando caminho:', indexPath);
      return indexPath;
    }
  } catch (error) {
    log.warn('Erro ao verificar caminho:', error);
  }

  // Fallback: caminho relativo
  const fallbackPath = path.join(__dirname, '../dist/index.html');
  log.warn('Usando caminho fallback:', fallbackPath);
  return fallbackPath;
}

// Definir o ícone da aplicação
function getIconPath() {
  if (isDev) {
    return path.join(__dirname, '../../public/logo.png');
  }
  // Em produção, o ícone está no resources do app
  const iconPath = path.join(process.resourcesPath, 'logo.png');
  const fs = require('fs');
  if (fs.existsSync(iconPath)) {
    return iconPath;
  }
  // Fallback: tentar no diretório dist
  const distIcon = path.join(__dirname, '../dist/logo.png');
  if (fs.existsSync(distIcon)) {
    return distIcon;
  }
  // Se não encontrar, retorna undefined para usar o padrão
  return undefined;
}

function createWindow() {
  // Definir o ícone da aplicação
  const iconPath = getIconPath();
  
  // Definir o ícone da aplicação globalmente (se existir)
  if (iconPath && require('fs').existsSync(iconPath)) {
    try {
      app.setIcon(iconPath);
    } catch (error) {
      log.warn('Erro ao definir ícone:', error);
    }
  }

  const windowOptions: any = {
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    frame: false, // Janela sem bordas para customização total
    titleBarStyle: 'hidden',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0a0a0a' : '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    show: false, // Não mostrar até carregar
    transparent: false,
  };

  // Adicionar ícone apenas se existir
  if (iconPath && require('fs').existsSync(iconPath)) {
    windowOptions.icon = iconPath;
  }

  mainWindow = new BrowserWindow(windowOptions);

  // Tratamento de erros
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log.error('Falha ao carregar:', errorCode, errorDescription);
    if (isDev) {
      mainWindow?.webContents.openDevTools();
    }
  });

  mainWindow.webContents.on('crashed', () => {
    log.error('Renderer process crashed');
  });

  mainWindow.webContents.on('unresponsive', () => {
    log.warn('Renderer process is unresponsive');
  });

  // Carregar aplicação
  if (isDev) {
    // Apenas em desenvolvimento: carregar do servidor Vite
    log.info('Modo desenvolvimento: carregando de http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173').catch((err) => {
      log.error('Erro ao carregar URL:', err);
      // Se falhar, mostrar janela mesmo assim para debug
      mainWindow?.show();
    });
    mainWindow.webContents.openDevTools();
  } else {
    // Em produção: carregar do arquivo local
    log.info('Modo produção: carregando arquivo local');
    // Encontrar o index.html em produção
    const indexPath = findIndexHtml();
    
    log.info('Carregando aplicação de:', indexPath);
    log.info('__dirname:', __dirname);
    log.info('process.resourcesPath:', process.resourcesPath);
    log.info('app.getAppPath():', app.getAppPath());
    
    // Usar loadFile que funciona tanto com arquivos normais quanto com asar
    mainWindow.loadFile(indexPath).catch((err) => {
      log.error('Erro ao carregar arquivo:', err);
      log.error('Código de erro:', (err as any)?.code);
      log.error('Caminho tentado:', indexPath);
      
      // Tentar carregar via loadURL se loadFile falhar
      try {
        const fileUrl = `file://${indexPath.replace(/\\/g, '/')}`;
        log.info('Tentando carregar via URL:', fileUrl);
        mainWindow.loadURL(fileUrl).catch((urlErr) => {
          log.error('Erro ao carregar via URL:', urlErr);
          // Mostrar janela mesmo com erro para debug
          mainWindow?.show();
        });
      } catch (urlError) {
        log.error('Erro ao tentar loadURL:', urlError);
        mainWindow?.show();
      }
    });
  }

  // Mostrar janela quando pronta
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    
    // Focar na janela
    if (mainWindow) {
      mainWindow.focus();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Aplicar tema do sistema
  nativeTheme.on('updated', () => {
    if (mainWindow) {
      mainWindow.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
    }
  });
}

// Handlers IPC
function setupIpcHandlers() {
  // Controles de janela customizados
  ipcMain.handle('window-minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.handle('window-close', () => {
    mainWindow?.close();
  });

  ipcMain.handle('window-is-maximized', () => {
    return mainWindow?.isMaximized() || false;
  });

  // Tema do sistema
  ipcMain.handle('get-system-theme', () => {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  });

  ipcMain.handle('get-system-color-scheme', async () => {
    if (process.platform === 'darwin') {
      // macOS
      const accent = systemPreferences.getAccentColor();
      const systemColors = {
        accent: `#${accent}`,
        theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
      };
      return systemColors;
    } else if (process.platform === 'win32') {
      // Windows
      const accent = await systemPreferences.getColor('accent');
      const systemColors = {
        accent,
        theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
      };
      return systemColors;
    }
    return {
      accent: '#0078d4',
      theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
    };
  });

  // Registrar handlers de dispositivos
  registerDeviceHandlers();
  registerPrinterHandlers();
  registerScaleHandlers();
  registerPrinterDriverHandlers();
}

// App lifecycle
app.whenReady().then(() => {
  log.info('App pronto, criando janela...');
  try {
    // Registrar handlers IPC ANTES de criar a janela para evitar race conditions
    setupIpcHandlers();
    createWindow();
    log.info('Janela criada com sucesso');
  } catch (error) {
    log.error('Erro ao criar janela:', error);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch((error) => {
  log.error('Erro ao inicializar app:', error);
});

// Variável para rastrear se há atualização baixada
let updateDownloadedAndReady = false;

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  log.error('Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Promise rejeitada não tratada:', reason);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Se houver uma atualização baixada, instalar antes de fechar
    if (!isDev && updateDownloadedAndReady) {
      log.info('Fechando aplicação e instalando atualização...');
      autoUpdater.quitAndInstall(false, true);
    } else {
      app.quit();
    }
  }
});

// Antes de fechar, verificar se há atualização para instalar
app.on('before-quit', (event) => {
  if (!isDev && updateDownloadedAndReady) {
    log.info('Atualização pendente detectada, instalando antes de fechar...');
    // Prevenir o fechamento normal para instalar a atualização
    event.preventDefault();
    autoUpdater.quitAndInstall(false, true);
  }
});

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
  log.info('Verificando atualizações...');
  if (mainWindow) {
    mainWindow.webContents.send('update-checking');
  }
});

autoUpdater.on('update-available', (info) => {
  log.info('Atualização disponível:', info.version);
  log.info('Iniciando download automático da atualização...');
  if (mainWindow) {
    mainWindow.webContents.send('update-available', info);
  }
  // O download começa automaticamente porque autoDownload = true
});

autoUpdater.on('update-not-available', (info) => {
  log.info('Aplicação está atualizada:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-not-available', info);
  }
});

autoUpdater.on('error', (err) => {
  log.error('Erro no auto-updater:', err);
  if (mainWindow) {
    mainWindow.webContents.send('update-error', err.message);
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-progress', progressObj);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Atualização baixada com sucesso:', info.version);
  log.info('A atualização será instalada automaticamente quando o aplicativo for fechado.');
  updateDownloadedAndReady = true; // Marcar que há atualização pronta
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', info);
    // Notificar o usuário que a atualização foi baixada e será instalada
    mainWindow.webContents.send('update-ready-to-install', {
      version: info.version,
      message: 'Atualização baixada! Será instalada automaticamente quando você fechar o aplicativo.'
    });
  }
});

// Handler para reiniciar e instalar atualização
ipcMain.handle('restart-and-install-update', () => {
  autoUpdater.quitAndInstall();
});

// Handler para verificar atualizações manualmente
ipcMain.handle('check-for-updates', () => {
  autoUpdater.checkForUpdatesAndNotify();
});

