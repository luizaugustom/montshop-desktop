import { ipcMain } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { app } from 'electron';

const execAsync = promisify(exec);

// Simulação de conexão com balança (em produção, usar biblioteca específica)
const scaleConnections = new Map<string, any>();

export function registerScaleHandlers() {
  // Listar portas seriais disponíveis (balanças)
  ipcMain.handle('scales-list', async () => {
    try {
      if (process.platform === 'win32') {
        // Windows: usar WMI para listar portas COM
        const { stdout } = await execAsync(
          'powershell -Command "Get-WmiObject Win32_SerialPort | Select-Object DeviceID, Description, Name | ConvertTo-Json"'
        );
        const ports = JSON.parse(stdout);
        return Array.isArray(ports) ? ports : [ports];
      } else if (process.platform === 'darwin') {
        // macOS: listar /dev/tty.*
        const { stdout } = await execAsync('ls /dev/tty.*');
        const ports = stdout.split('\n')
          .filter((line) => line.includes('tty.'))
          .map((line) => ({
            DeviceID: line.trim(),
            Description: 'Serial Port',
            Name: line.trim(),
          }));
        return ports;
      } else {
        // Linux: listar /dev/ttyUSB* e /dev/ttyACM*
        const { stdout } = await execAsync('ls /dev/ttyUSB* /dev/ttyACM* 2>/dev/null || echo ""');
        const ports = stdout.split('\n')
          .filter((line) => line.trim())
          .map((line) => ({
            DeviceID: line.trim(),
            Description: 'Serial Port',
            Name: line.trim(),
          }));
        return ports;
      }
    } catch (error: any) {
      console.error('Erro ao listar portas seriais:', error);
      return [];
    }
  });

  // Conectar à balança
  ipcMain.handle('scales-connect', async (_event, port: string) => {
    try {
      // Em produção, usar biblioteca como 'serialport' para conectar
      // Por enquanto, simular conexão
      scaleConnections.set(port, {
        port,
        connected: true,
        connectedAt: new Date(),
      });
      console.log(`Conectado à balança na porta ${port}`);
    } catch (error) {
      console.error('Erro ao conectar à balança:', error);
      throw error;
    }
  });

  // Ler peso da balança
  ipcMain.handle('scales-read', async (_event, port: string) => {
    try {
      const connection = scaleConnections.get(port);
      if (!connection || !connection.connected) {
        throw new Error('Balança não conectada');
      }

      // Em produção, ler dados reais da porta serial
      // Por enquanto, retornar valor simulado
      return '1.250 kg';
    } catch (error) {
      console.error('Erro ao ler balança:', error);
      throw error;
    }
  });

  // Desconectar da balança
  ipcMain.handle('scales-disconnect', async (_event, port: string) => {
    try {
      scaleConnections.delete(port);
      console.log(`Desconectado da balança na porta ${port}`);
    } catch (error) {
      console.error('Erro ao desconectar balança:', error);
      throw error;
    }
  });

  // Verificar drivers de balança
  ipcMain.handle('scales-check-drivers', async () => {
    try {
      // Verificar se drivers USB/Serial estão instalados
      if (process.platform === 'win32') {
        const { stdout } = await execAsync(
          'powershell -Command "Get-PnpDevice | Where-Object {$_.Class -eq \'Ports\'} | Select-Object FriendlyName, Status | ConvertTo-Json"'
        );
        const devices = JSON.parse(stdout);
        return {
          installed: Array.isArray(devices) ? devices : [devices],
          needsInstall: false,
        };
      }
      return {
        installed: [],
        needsInstall: false,
      };
    } catch (error) {
      console.error('Erro ao verificar drivers de balança:', error);
      return {
        installed: [],
        needsInstall: true,
      };
    }
  });

  // Instalar drivers de balança
  ipcMain.handle('scales-install-drivers', async () => {
    try {
      // Em produção, baixar e instalar drivers específicos da balança
      const driversPath = path.join(app.getPath('userData'), 'drivers', 'scales');
      console.log('Instalando drivers de balança...');
      return;
    } catch (error) {
      console.error('Erro ao instalar drivers de balança:', error);
      throw error;
    }
  });
}

