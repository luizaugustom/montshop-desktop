import { ipcMain, dialog, BrowserWindow } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import { app } from 'electron';
import {
  downloadFile,
  getCachedFile,
  cacheFile,
  cleanOldCache,
  type DownloadProgress,
} from '../utils/download-manager';
import {
  PRINTER_DRIVERS,
  getDriverById,
  getDriversByBrand,
  detectPrinterBrand,
  type PrinterDriver,
} from '../utils/printer-drivers';

const execAsync = promisify(exec);

// Armazenar progresso de download por driver
const downloadProgress = new Map<string, DownloadProgress>();

export function registerPrinterDriverHandlers() {
  // Listar todos os drivers disponíveis
  ipcMain.handle('printer-drivers-list', async () => {
    return {
      drivers: PRINTER_DRIVERS,
      byBrand: getDriversByBrand(),
    };
  });

  // Obter informações de um driver específico
  ipcMain.handle('printer-drivers-get', async (_event, driverId: string) => {
    return getDriverById(driverId);
  });

  // Verificar se um driver está instalado
  ipcMain.handle('printer-drivers-check', async (_event, driverId: string) => {
    const driver = getDriverById(driverId);
    if (!driver) {
      return { installed: false, error: 'Driver não encontrado' };
    }

    try {
      if (process.platform === 'win32') {
        // Windows: verificar via PowerShell
        const { stdout } = await execAsync(
          `powershell -Command "Get-PrinterDriver | Where-Object { $_.Name -like '*${driver.driverName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}*' } | Select-Object Name | ConvertTo-Json"`
        );
        const drivers = stdout.trim();
        const installed = drivers && drivers !== 'null' && drivers !== '[]';
        
        installedDriversCache.set(driverId, installed);
        return { installed, driverName: driver.driverName };
      } else if (process.platform === 'darwin') {
        // macOS: verificar via lpinfo
        try {
          const { stdout } = await execAsync(`lpinfo -m | grep -i "${driver.driverName}"`);
          const installed = stdout.trim().length > 0;
          installedDriversCache.set(driverId, installed);
          return { installed, driverName: driver.driverName };
        } catch {
          return { installed: false, driverName: driver.driverName };
        }
      } else {
        // Linux: verificar via lpinfo
        try {
          const { stdout } = await execAsync(`lpinfo -m | grep -i "${driver.driverName}"`);
          const installed = stdout.trim().length > 0;
          installedDriversCache.set(driverId, installed);
          return { installed, driverName: driver.driverName };
        } catch {
          return { installed: false, driverName: driver.driverName };
        }
      }
    } catch (error: any) {
      console.error(`Erro ao verificar driver ${driverId}:`, error);
      return { installed: false, error: error.message };
    }
  });

  // Cache de drivers instalados
  const installedDriversCache = new Map<string, boolean>();

  // Verificar múltiplos drivers
  ipcMain.handle('printer-drivers-check-multiple', async (_event, driverIds: string[]) => {
    const results: Record<string, { installed: boolean; driverName?: string }> = {};
    
    for (const driverId of driverIds) {
      const driver = getDriverById(driverId);
      if (!driver) continue;

      try {
        if (process.platform === 'win32') {
          const { stdout } = await execAsync(
            `powershell -Command "Get-PrinterDriver | Where-Object { $_.Name -like '*${driver.driverName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}*' } | Select-Object Name | ConvertTo-Json"`
          );
          const drivers = stdout.trim();
          const installed = drivers && drivers !== 'null' && drivers !== '[]';
          results[driverId] = { installed, driverName: driver.driverName };
        } else {
          try {
            const { stdout } = await execAsync(`lpinfo -m | grep -i "${driver.driverName}"`);
            const installed = stdout.trim().length > 0;
            results[driverId] = { installed, driverName: driver.driverName };
          } catch {
            results[driverId] = { installed: false, driverName: driver.driverName };
          }
        }
      } catch (error) {
        results[driverId] = { installed: false, driverName: driver.driverName };
      }
    }
    
    return results;
  });

  // Detectar marca provável da impressora
  ipcMain.handle('printer-drivers-detect-brand', async (_event, printerName: string) => {
    return detectPrinterBrand(printerName);
  });

  // Baixar driver com progresso
  ipcMain.handle('printer-drivers-download', async (_event, driverId: string) => {
    const driver = getDriverById(driverId);
    if (!driver) {
      throw new Error('Driver não encontrado');
    }

    const platform = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'mac' : 'linux';
    const downloadUrl = driver.downloadUrl[platform as keyof typeof driver.downloadUrl];

    if (!downloadUrl) {
      throw new Error(`Driver não suporta ${platform}`);
    }

    // Para drivers genéricos ESC/POS, não precisa baixar
    if (driverId === 'generic-escpos') {
      return { success: true, message: 'Driver genérico não requer download' };
    }

    try {
      const driversDir = path.join(app.getPath('userData'), 'drivers', 'printers');
      await fs.mkdir(driversDir, { recursive: true });

      // Obter extensão do arquivo da URL ou usar padrão
      const urlParts = downloadUrl.split('/');
      const urlFileName = urlParts[urlParts.length - 1];
      const fileName = urlFileName || `${driver.id}-${platform}.exe`;
      const filePath = path.join(driversDir, fileName);

      // Verificar cache primeiro
      const expectedHash = driver.expectedHash?.[platform as keyof typeof driver.expectedHash];
      const cachedFile = await getCachedFile(fileName, expectedHash);

      if (cachedFile) {
        // Copiar do cache
        await fs.copyFile(cachedFile, filePath);
        return {
          success: true,
          filePath,
          fileName,
          downloadUrl,
          fromCache: true,
          message: 'Driver baixado do cache',
        };
      }

      // Inicializar progresso
      downloadProgress.set(driverId, {
        received: 0,
        total: driver.fileSize?.[platform as keyof typeof driver.fileSize] || 0,
        percentage: 0,
        speed: 0,
      });

      // Obter referência à janela principal
      const mainWindow = BrowserWindow.getAllWindows()[0];

      // Fazer download real
      const result = await downloadFile({
        url: downloadUrl,
        destination: filePath,
        expectedHash,
        hashAlgorithm: driver.hashAlgorithm || 'sha256',
        onProgress: (progress) => {
          downloadProgress.set(driverId, progress);
          // Notificar renderer sobre progresso
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('driver-download-progress', {
              driverId,
              progress,
            });
          }
        },
        timeout: 300000, // 5 minutos
        retries: 3,
      });

      if (result.success && result.filePath) {
        // Adicionar ao cache
        await cacheFile(result.filePath, fileName);

        // Limpar cache antigo (em background)
        cleanOldCache(30).catch(() => {});

        downloadProgress.delete(driverId);

        return {
          success: true,
          filePath: result.filePath,
          fileName,
          downloadUrl,
          verified: result.verified,
          hash: result.hash,
          fromCache: false,
          message: 'Driver baixado com sucesso!',
        };
      } else {
        downloadProgress.delete(driverId);
        throw new Error(result.error || 'Falha no download');
      }
    } catch (error: any) {
      downloadProgress.delete(driverId);
      throw new Error(`Erro ao baixar driver: ${error.message}`);
    }
  });

  // Obter progresso de download
  ipcMain.handle('printer-drivers-download-progress', async (_event, driverId: string) => {
    return downloadProgress.get(driverId) || null;
  });

  // Instalar driver
  ipcMain.handle('printer-drivers-install', async (_event, driverId: string, installerPath?: string) => {
    const driver = getDriverById(driverId);
    if (!driver) {
      throw new Error('Driver não encontrado');
    }

    try {
      const platform = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'mac' : 'linux';
      const installCommand = driver.installCommand[platform as keyof typeof driver.installCommand];

      // Driver genérico ESC/POS - não requer instalação
      if (driverId === 'generic-escpos') {
        return {
          success: true,
          message: 'Driver genérico ESC/POS configurado. Nenhuma instalação necessária.',
        };
      }

      if (!installCommand && !installerPath) {
        throw new Error(`Comando de instalação não disponível para ${platform}`);
      }

      // Se o caminho do instalador foi fornecido, usar ele
      let finalCommand = installCommand || '';
      if (installerPath) {
        if (platform === 'windows') {
          const ext = path.extname(installerPath).toLowerCase();
          if (ext === '.msi') {
            finalCommand = `msiexec /i "${installerPath}" /quiet /norestart`;
          } else if (ext === '.exe') {
            finalCommand = `"${installerPath}" /S /quiet`;
          } else {
            throw new Error('Formato de instalador não suportado');
          }
        } else if (platform === 'darwin') {
          finalCommand = `installer -pkg "${installerPath}" -target /`;
        } else {
          // Linux
          const ext = path.extname(installerPath).toLowerCase();
          if (ext === '.deb') {
            finalCommand = `dpkg -i "${installerPath}"`;
          } else if (ext === '.rpm') {
            finalCommand = `rpm -i "${installerPath}"`;
          } else {
            throw new Error('Formato de instalador não suportado');
          }
        }
      }

      console.log(`Instalando driver ${driverId} com comando: ${finalCommand}`);

      // Executar instalação
      const { stdout, stderr } = await execAsync(finalCommand);
      
      // Aguardar um pouco para o driver ser reconhecido
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verificar se foi instalado
      let installed = false;
      try {
        if (process.platform === 'win32') {
          const { stdout } = await execAsync(
            `powershell -Command "Get-PrinterDriver | Where-Object { $_.Name -like '*${driver.driverName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}*' } | Select-Object Name | ConvertTo-Json"`
          );
          const drivers = stdout.trim();
          installed = drivers && drivers !== 'null' && drivers !== '[]';
        } else {
          try {
            const { stdout } = await execAsync(`lpinfo -m | grep -i "${driver.driverName}"`);
            installed = stdout.trim().length > 0;
          } catch {
            installed = false;
          }
        }
      } catch {
        installed = false;
      }

      if (installed) {
        installedDriversCache.set(driverId, true);
        return {
          success: true,
          message: `Driver ${driver.driverName} instalado com sucesso!`,
        };
      } else {
        return {
          success: false,
          message: `Instalação concluída, mas o driver pode não ter sido reconhecido. Reinicie o sistema ou verifique manualmente.`,
        };
      }
    } catch (error: any) {
      console.error(`Erro ao instalar driver ${driverId}:`, error);
      throw new Error(`Erro na instalação: ${error.message}`);
    }
  });

  // Instalar driver via arquivo local (selecionado pelo usuário)
  ipcMain.handle('printer-drivers-install-from-file', async (_event) => {
    if (!app.isReady()) {
      throw new Error('Aplicação não está pronta');
    }

    const result = await dialog.showOpenDialog({
      title: 'Selecionar Instalador do Driver',
      filters: [
        { name: 'Instaladores Windows', extensions: ['msi', 'exe'] },
        { name: 'Instaladores macOS', extensions: ['pkg', 'dmg'] },
        { name: 'Instaladores Linux', extensions: ['deb', 'rpm'] },
        { name: 'Todos os arquivos', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const installerPath = result.filePaths[0];
    
    try {
      const platform = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'mac' : 'linux';
      
      let command = '';
      if (platform === 'windows') {
        const ext = path.extname(installerPath).toLowerCase();
        if (ext === '.msi') {
          command = `msiexec /i "${installerPath}" /quiet /norestart`;
        } else if (ext === '.exe') {
          command = `"${installerPath}" /S /quiet`;
        } else {
          throw new Error('Formato de instalador não suportado');
        }
      } else if (platform === 'darwin') {
        command = `installer -pkg "${installerPath}" -target /`;
      } else {
        const ext = path.extname(installerPath).toLowerCase();
        if (ext === '.deb') {
          command = `sudo dpkg -i "${installerPath}"`;
        } else if (ext === '.rpm') {
          command = `sudo rpm -i "${installerPath}"`;
        } else {
          throw new Error('Formato de instalador não suportado');
        }
      }

      await execAsync(command);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      return {
        success: true,
        message: 'Driver instalado com sucesso!',
      };
    } catch (error: any) {
      throw new Error(`Erro na instalação: ${error.message}`);
    }
  });
}
