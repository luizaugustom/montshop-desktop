import { ipcMain } from 'electron';
import ThermalPrinter from 'node-thermal-printer';
import { PrinterTypes } from 'node-thermal-printer';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

// Cache de impressoras conectadas
let cachedPrinters: any[] = [];

/**
 * Lista impressoras disponíveis no sistema
 */
async function listPrinters(): Promise<any[]> {
  try {
    const platform = process.platform;
    
    if (platform === 'win32') {
      // Windows: usar PowerShell para listar impressoras
      const command = `powershell.exe -Command "Get-Printer | Select-Object Name, PrinterStatus, DriverName, PortName | ConvertTo-Json"`;
      const { stdout } = await execAsync(command);
      const printers = JSON.parse(stdout);
      
      return Array.isArray(printers) ? printers.map((p: any) => ({
        name: p.Name,
        status: p.PrinterStatus === 0 ? 'online' : 'offline',
        driver: p.DriverName,
        port: p.PortName,
        isDefault: p.Name === 'Microsoft Print to PDF' ? false : true, // Evitar PDF como padrão
      })) : [printers].map((p: any) => ({
        name: p.Name,
        status: p.PrinterStatus === 0 ? 'online' : 'offline',
        driver: p.DriverName,
        port: p.PortName,
        isDefault: true,
      }));
    } else if (platform === 'darwin') {
      // macOS: usar lpstat
      const { stdout } = await execAsync('lpstat -p');
      const lines = stdout.split('\n').filter((l: string) => l.trim());
      return lines.map((line: string) => {
        const match = line.match(/printer (\S+)/);
        return match ? {
          name: match[1],
          status: 'online',
          driver: 'Unknown',
          port: 'Unknown',
          isDefault: false,
        } : null;
      }).filter(Boolean) as any[];
    } else {
      // Linux: usar lpstat
      const { stdout } = await execAsync('lpstat -p');
      const lines = stdout.split('\n').filter((l: string) => l.trim());
      return lines.map((line: string) => {
        const match = line.match(/printer (\S+)/);
        return match ? {
          name: match[1],
          status: 'online',
          driver: 'Unknown',
          port: 'Unknown',
          isDefault: false,
        } : null;
      }).filter(Boolean) as any[];
    }
  } catch (error) {
    console.error('Erro ao listar impressoras:', error);
    return [];
  }
}

/**
 * Encontra impressora padrão do sistema
 */
async function getDefaultPrinter(): Promise<string | null> {
  try {
    const platform = process.platform;
    
    if (platform === 'win32') {
      const command = `powershell.exe -Command "(Get-Printer | Where-Object {$_.Default -eq $true}).Name"`;
      const { stdout } = await execAsync(command);
      const printerName = stdout.trim();
      return printerName || null;
    } else {
      const { stdout } = await execAsync('lpstat -d');
      const match = stdout.match(/system default destination: (.+)/);
      return match ? match[1] : null;
    }
  } catch (error) {
    console.error('Erro ao obter impressora padrão:', error);
    return null;
  }
}

/**
 * Imprime conteúdo usando node-thermal-printer (suporta ESC/POS)
 */
async function printWithThermalPrinter(printerName: string, content: string): Promise<{ success: boolean; error?: string }> {
  try {
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON, // Tipo genérico, funciona com maioria das impressoras térmicas
      interface: `printer:${printerName}`, // Usar nome da impressora
    });

    // Converter conteúdo de texto para comandos de impressão
    const lines = content.split('\n');
    
    for (const line of lines) {
      printer.alignLeft();
      printer.println(line);
    }
    
    // Cortar papel
    printer.cut();
    
    // Executar impressão
    await printer.execute();
    
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao imprimir com thermal printer:', error);
    return { success: false, error: error.message || 'Erro desconhecido' };
  }
}


/**
 * Imprime usando comandos do sistema operacional (fallback universal)
 */
async function printWithSystemPrinter(printerName: string, content: string): Promise<{ success: boolean; error?: string }> {
  try {
    const platform = process.platform;
    
    // Criar arquivo temporário com conteúdo
    const tempFile = path.join(os.tmpdir(), `print-${Date.now()}.txt`);
    fs.writeFileSync(tempFile, content, 'utf8');
    
    if (platform === 'win32') {
      // Windows: usar PRINT command
      const command = `print /D:"${printerName}" "${tempFile}"`;
      await execAsync(command);
    } else if (platform === 'darwin') {
      // macOS: usar lp
      const command = `lp -d "${printerName}" "${tempFile}"`;
      await execAsync(command);
    } else {
      // Linux: usar lp
      const command = `lp -d "${printerName}" "${tempFile}"`;
      await execAsync(command);
    }
    
    // Limpar arquivo temporário após um delay
    setTimeout(() => {
      try {
        fs.unlinkSync(tempFile);
      } catch {
        // Ignorar erros ao deletar
      }
    }, 5000);
    
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao imprimir com sistema:', error);
    return { success: false, error: error.message || 'Erro ao imprimir' };
  }
}

/**
 * Função principal de impressão que tenta múltiplos métodos
 */
async function printContent(printerName: string | null, content: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Se não especificou impressora, usar padrão
    if (!printerName) {
      printerName = await getDefaultPrinter();
      if (!printerName) {
        return { success: false, error: 'Nenhuma impressora encontrada' };
      }
    }
    
    // Tentar métodos em ordem de preferência
    // 1. node-thermal-printer (melhor para impressoras térmicas)
    let result = await printWithThermalPrinter(printerName, content);
    if (result.success) {
      return result;
    }
    
    // 2. Sistema operacional (fallback universal)
    result = await printWithSystemPrinter(printerName, content);
    return result;
  } catch (error: any) {
    console.error('Erro na impressão:', error);
    return { success: false, error: error.message || 'Erro desconhecido na impressão' };
  }
}

export function registerPrinterHandlers() {
  // Listar impressoras disponíveis
  ipcMain.handle('printers-list', async () => {
    try {
      const printers = await listPrinters();
      cachedPrinters = printers;
      return { success: true, printers };
    } catch (error: any) {
      return { success: false, error: error.message, printers: [] };
    }
  });

  // Obter impressora padrão
  ipcMain.handle('printers-get-default', async () => {
    try {
      const printerName = await getDefaultPrinter();
      return { success: true, printerName };
    } catch (error: any) {
      return { success: false, error: error.message, printerName: null };
    }
  });

  // Imprimir conteúdo
  ipcMain.handle('print-content', async (_event, printerName: string | null, content: string) => {
    try {
      const result = await printContent(printerName, content);
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Erro desconhecido' };
    }
  });

  // Testar impressora
  ipcMain.handle('printers-test', async (_event, printerName: string | null) => {
    try {
      const testContent = `
================================
  TESTE DE IMPRESSÃO
================================
Esta é uma impressão de teste.
Se você está lendo isso, a
impressora está funcionando
corretamente.
================================
TESTE CONCLUÍDO
================================
      `.trim();
      
      const result = await printContent(printerName, testContent);
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Erro ao testar impressora' };
    }
  });
}
