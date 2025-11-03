import { ipcMain } from 'electron';
import { machineIdSync } from 'node-machine-id';
import os from 'os';

export function registerDeviceHandlers() {
  // Obter ID único do computador
  ipcMain.handle('get-computer-id', async () => {
    try {
      const id = machineIdSync();
      return id;
    } catch (error) {
      // Fallback para hostname se machine-id falhar
      return os.hostname();
    }
  });

  // Obter informações do sistema
  ipcMain.handle('get-system-info', async () => {
    return {
      platform: process.platform,
      arch: process.arch,
      hostname: os.hostname(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpus: os.cpus().length,
      osType: os.type(),
      osRelease: os.release(),
      osVersion: os.version(),
    };
  });
}

