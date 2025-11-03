import { ipcMain } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as os from 'os';
import { promises as fs } from 'fs';
import { app } from 'electron';
import { printThermal, getPrinterType, detectPrinterInterface, type PrinterConfig } from '../utils/thermal-printer';

const execAsync = promisify(exec);

export function registerPrinterHandlers() {
  // Listar impressoras disponíveis
  ipcMain.handle('printers-list', async () => {
    try {
      if (process.platform === 'win32') {
        // Windows: usar PowerShell para listar impressoras com todas as informações necessárias
        const psCommand = `
          Get-Printer | Select-Object Name, DriverName, PrinterStatus, PortName, @{Name='IsDefault';Expression={$_.IsDefault}} | 
          ConvertTo-Json -Compress
        `;
        const { stdout, stderr } = await execAsync(
          `powershell -Command "${psCommand.replace(/\n/g, ' ')}"`
        );
        
        if (stderr && !stdout) {
          console.error('Erro ao executar PowerShell:', stderr);
          return [];
        }

        if (!stdout || stdout.trim() === '' || stdout.trim() === 'null') {
          console.log('Nenhuma impressora encontrada no sistema');
          return [];
        }

        let printers;
        try {
          printers = JSON.parse(stdout);
        } catch (parseError) {
          console.error('Erro ao fazer parse do JSON:', parseError, 'Output:', stdout);
          return [];
        }

        // Normalizar para sempre retornar array
        if (!Array.isArray(printers)) {
          printers = [printers];
        }

        // Filtrar valores null e mapear para formato consistente
        return printers
          .filter((p: any) => p && p.Name)
          .map((printer: any) => ({
            name: printer.Name,
            DriverName: printer.DriverName || 'Unknown',
            PrinterStatus: printer.PrinterStatus || 'Unknown',
            PortName: printer.PortName || 'Unknown',
            IsDefault: printer.IsDefault || false,
            status: printer.PrinterStatus === 0 ? 'online' : 
                   printer.PrinterStatus === 1 ? 'offline' : 
                   printer.PrinterStatus === 3 ? 'error' : 'unknown',
            driver: printer.DriverName || 'Unknown',
            port: printer.PortName || 'Unknown',
            isDefault: printer.IsDefault || false,
          }));
      } else if (process.platform === 'darwin') {
        // macOS: usar lpstat
        const { stdout } = await execAsync('lpstat -p -d');
        const lines = stdout.split('\n').filter((line) => line.trim());
        const printers = lines.map((line) => {
          const match = line.match(/printer (\S+)/);
          return match ? { name: match[1], status: 'idle', driver: 'Unknown', port: 'Unknown' } : null;
        }).filter(Boolean);
        return printers;
      } else {
        // Linux: usar lpstat
        const { stdout } = await execAsync('lpstat -p -d');
        const lines = stdout.split('\n').filter((line) => line.trim());
        const printers = lines.map((line) => {
          const match = line.match(/printer (\S+)/);
          return match ? { name: match[1], status: 'idle', driver: 'Unknown', port: 'Unknown' } : null;
        }).filter(Boolean);
        return printers;
      }
    } catch (error: any) {
      console.error('Erro ao listar impressoras:', error);
      // Se o erro for porque não há impressoras, retornar array vazio
      if (error.message && error.message.includes('does not exist')) {
        return [];
      }
      return [];
    }
  });

  // Obter impressora padrão
  ipcMain.handle('printers-get-default', async () => {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync(
          'powershell -Command "(Get-Printer | Where-Object {$_.Default -eq $true}).Name"'
        );
        return stdout.trim() || null;
      } else {
        const { stdout } = await execAsync('lpstat -d');
        const match = stdout.match(/system default destination: (\S+)/);
        return match ? match[1] : null;
      }
    } catch (error) {
      console.error('Erro ao obter impressora padrão:', error);
      return null;
    }
  });

  // Imprimir conteúdo
  ipcMain.handle('printers-print', async (_event, printerName: string, content: string, options?: {
    brand?: string;
    model?: string;
    port?: string;
  }) => {
    try {
      console.log(`[PrinterHandler] Iniciando impressão na impressora: ${printerName}`);
      
      // Tentar impressão térmica primeiro (mais confiável para impressoras térmicas)
      // Detectar marca/modelo automaticamente se não fornecido
      let detectedBrand = options?.brand;
      let detectedPort = options?.port;
      
      if (!detectedBrand || !detectedPort) {
        // Tentar obter informações da impressora do sistema
        try {
          if (process.platform === 'win32') {
            const psCommand = `Get-Printer -Name "${printerName}" -ErrorAction SilentlyContinue | Select-Object DriverName, PortName | ConvertTo-Json -Compress`;
            const { stdout } = await execAsync(`powershell -Command "${psCommand}"`);
            if (stdout && stdout.trim() && stdout.trim() !== 'null') {
              const printerData = JSON.parse(stdout);
              detectedBrand = detectedBrand || printerData.DriverName || printerData.Driver;
              detectedPort = detectedPort || printerData.PortName || printerData.Port;
            }
          }
        } catch (detectError) {
          console.warn('[PrinterHandler] Erro ao detectar informações da impressora:', detectError);
        }
      }

      // Tentar impressão térmica se detectou marca ou se o nome sugere impressora térmica
      const isThermalPrinter = detectedBrand || 
        printerName.toLowerCase().match(/epson|bematech|elgin|daruma|star|zebra|thermal|térmica/i);
      
      if (isThermalPrinter) {
        try {
          const printerType = getPrinterType(detectedBrand || 'epson', options?.model || '');
          const printerInterface = detectPrinterInterface(printerName, detectedPort);
          
          const config: PrinterConfig = {
            type: printerType,
            interface: printerInterface,
          };

          console.log('[PrinterHandler] Tentando impressão térmica:', config);
          await printThermal(content, config);
          console.log('[PrinterHandler] Impressão térmica concluída com sucesso');
          return; // Sucesso na impressão térmica
        } catch (thermalError: any) {
          console.warn('[PrinterHandler] Falha na impressão térmica, tentando método genérico:', thermalError.message);
          // Continuar com método genérico
        }
      }

      // Método genérico (fallback)
      console.log('[PrinterHandler] Usando método genérico de impressão');
      if (process.platform === 'win32') {
        // Windows: usar comando de impressão genérico
        // Criar arquivo temporário com o conteúdo e imprimir
        const tmpDir = os.tmpdir();
        const tmpFile = path.join(tmpDir, `montshop-print-${Date.now()}.txt`);
        
        try {
          // Salvar conteúdo em arquivo temporário com encoding UTF-8
          await fs.writeFile(tmpFile, content, { encoding: 'utf8' });
          
          // Imprimir arquivo
          const psCommand = `Get-Content -Path '${tmpFile.replace(/'/g, "''")}' -Encoding UTF8 | Out-Printer -Name "${printerName}"`;
          await execAsync(`powershell -Command "${psCommand}"`);
          
          // Limpar arquivo temporário
          await fs.unlink(tmpFile).catch(() => {});
        } catch (fileError: any) {
          // Se falhar com arquivo, tentar método direto (menos confiável)
          await fs.unlink(tmpFile).catch(() => {});
          const escapedContent = content.replace(/'/g, "''").replace(/\$/g, '`$').replace(/`/g, '``');
          const psCommand = `"${escapedContent}" | Out-Printer -Name "${printerName}"`;
          await execAsync(`powershell -Command "${psCommand}"`);
        }
      } else {
        // Linux/macOS: usar lpr
        await execAsync(`echo "${content.replace(/"/g, '\\"')}" | lpr -P "${printerName}"`);
      }
      
      console.log('[PrinterHandler] Impressão genérica concluída com sucesso');
    } catch (error: any) {
      console.error('[PrinterHandler] Erro ao imprimir:', error);
      throw new Error(`Erro ao imprimir: ${error.message}`);
    }
  });

  // Testar impressora
  ipcMain.handle('printers-test', async (_event, printerName: string) => {
    try {
      const testContent = `
================================
     TESTE DE IMPRESSORA
================================

Impressora: ${printerName}
Data/Hora: ${new Date().toLocaleString('pt-BR')}

Este é um teste de impressão.

================================
      FIM DO TESTE
================================
      `;
      // Reutilizar handler de impressão
      if (process.platform === 'win32') {
        await execAsync(`echo "${testContent}" | Out-Printer -Name "${printerName}"`);
      } else {
        await execAsync(`echo "${testContent}" | lpr -P "${printerName}"`);
      }
    } catch (error) {
      console.error('Erro ao testar impressora:', error);
      throw error;
    }
  });

  // Verificar drivers instalados
  ipcMain.handle('printers-check-drivers', async () => {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync(
          'powershell -Command "Get-PrinterDriver | Select-Object Name, DriverType | ConvertTo-Json"'
        );
        const drivers = JSON.parse(stdout);
        return {
          installed: Array.isArray(drivers) ? drivers : [drivers],
          needsInstall: false, // Implementar lógica de verificação
        };
      }
      return {
        installed: [],
        needsInstall: false,
      };
    } catch (error) {
      console.error('Erro ao verificar drivers:', error);
      return {
        installed: [],
        needsInstall: true,
      };
    }
  });

  // Instalar drivers (simplificado - em produção, usar instaladores específicos)
  ipcMain.handle('printers-install-drivers', async () => {
    try {
      // Em produção, aqui você baixaria e instalaria os drivers específicos
      // Para impressoras térmicas comuns (EPSON, Bematech, etc.)
      const driversPath = path.join(app.getPath('userData'), 'drivers');
      // Implementar lógica de instalação de drivers
      console.log('Instalando drivers de impressora...');
      return;
    } catch (error) {
      console.error('Erro ao instalar drivers:', error);
      throw error;
    }
  });

  // Verificar status detalhado de uma impressora
  ipcMain.handle('printers-check-status', async (_event, printerName: string) => {
    try {
      if (process.platform === 'win32') {
        // Windows: usar PowerShell para obter status detalhado
        const psCommand = `
          $printer = Get-Printer -Name "${printerName}" -ErrorAction SilentlyContinue;
          if ($printer) {
            $status = @{
              Name = $printer.Name;
              PrinterStatus = $printer.PrinterStatus;
              JobCount = (Get-PrintJob -PrinterName $printer.Name -ErrorAction SilentlyContinue).Count;
              IsDefault = $printer.IsDefault;
              PortName = $printer.PortName;
              DriverName = $printer.DriverName;
            };
            $status | ConvertTo-Json -Compress
          } else {
            'null'
          }
        `;
        
        const { stdout } = await execAsync(`powershell -Command "${psCommand.replace(/\n/g, ' ')}"`);
        
        if (!stdout || stdout.trim() === '' || stdout.trim() === 'null') {
          return {
            online: false,
            paperOk: false,
            error: true,
            message: 'Impressora não encontrada',
          };
        }

        const status = JSON.parse(stdout);
        
        // Mapear PrinterStatus do Windows:
        // 0 = Other
        // 1 = Unknown
        // 2 = Idle (Online)
        // 3 = Printing
        // 4 = WarmUp
        // 5 = Stopped Printing
        // 6 = Offline
        // 7 = Paused
        // 8 = Error
        // 9 = Busy
        // 10 = Not Available
        // 11 = Waiting
        // 12 = Processing
        // 13 = Initialization
        // 14 = Power Save
        // 15 = Pending Deletion
        const printerStatus = status.PrinterStatus || 0;
        const isOnline = printerStatus === 2 || printerStatus === 3 || printerStatus === 4 || printerStatus === 9 || printerStatus === 12;
        const hasError = printerStatus === 5 || printerStatus === 8 || printerStatus === 6;
        
        return {
          online: isOnline,
          paperOk: !hasError, // Assumir papel OK se não houver erro (melhor seria verificar diretamente)
          error: hasError,
          message: `Status: ${printerStatus}`,
          printerStatus,
          jobCount: status.JobCount || 0,
        };
      } else {
        // Linux/macOS: usar lpstat
        try {
          await execAsync(`lpstat -p ${printerName} 2>/dev/null`);
          return { online: true, paperOk: true };
        } catch {
          return { online: false, paperOk: false, error: true, message: 'Impressora não encontrada' };
        }
      }
    } catch (error: any) {
      console.error('Erro ao verificar status da impressora:', error);
      return {
        online: false,
        paperOk: false,
        error: true,
        message: error.message || 'Erro ao verificar status',
      };
    }
  });
}

