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

type PaperSizeOption = '80mm' | '58mm' | 'a4' | 'custom';

type PrinterStatusText = 'online' | 'offline' | 'error' | 'warning' | 'unknown';

interface PrintJobOptions {
  printerName?: string | null;
  port?: string | null;
  paperSize?: PaperSizeOption;
  customPaperWidth?: number | null;
  autoCut?: boolean;
}

interface PrintContentPayload {
  content: string;
  options?: PrintJobOptions;
}

/**
 * Lista impressoras disponíveis no sistema
 */
async function listPrinters(): Promise<any[]> {
  try {
    const platform = process.platform;
    
    if (platform === 'win32') {
      // Windows: usar PowerShell para listar impressoras
      const command = `powershell.exe -Command "Get-Printer | Select-Object Name, PrinterStatus, DriverName, PortName, Default | ConvertTo-Json"`;
      const { stdout } = await execAsync(command);
      if (!stdout) {
        return [];
      }

      const printers = JSON.parse(stdout);
      const printerArray = Array.isArray(printers) ? printers : [printers];
      
      return printerArray
        .filter(Boolean)
        .map((p: any) => {
          const statusCode = typeof p?.PrinterStatus === 'number' ? p.PrinterStatus : undefined;
          const status = mapPrinterStatus(statusCode);
          return {
            name: p?.Name,
            status,
            driver: p?.DriverName,
            port: p?.PortName,
            isDefault: Boolean(p?.Default),
            isConnected: status === 'online',
          };
        })
        .filter((printer: any) => printer.name);
    } else if (platform === 'darwin') {
      // macOS: usar lpstat
      const { stdout } = await execAsync('lpstat -p');
      const lines = stdout.split('\n').filter((l: string) => l.trim());
      return lines
        .map((line: string) => {
          const match = line.match(/printer (\S+)/);
          return match
            ? {
                name: match[1],
                status: 'online',
                driver: 'Unknown',
                port: 'Unknown',
                isDefault: false,
                isConnected: true,
              }
            : null;
        })
        .filter(Boolean) as any[];
    } else {
      // Linux: usar lpstat
      const { stdout } = await execAsync('lpstat -p');
      const lines = stdout.split('\n').filter((l: string) => l.trim());
      return lines
        .map((line: string) => {
          const match = line.match(/printer (\S+)/);
          return match
            ? {
                name: match[1],
                status: 'online',
                driver: 'Unknown',
                port: 'Unknown',
                isDefault: false,
                isConnected: true,
              }
            : null;
        })
        .filter(Boolean) as any[];
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
      const printerName = stdout?.trim();
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
 * Determina largura em colunas para impressão térmica
 */
function normalizePaperWidth(options?: PrintJobOptions): number {
  const paperSize = options?.paperSize ?? '80mm';

  switch (paperSize) {
    case '58mm':
      return 32;
    case 'a4':
      return 80;
    case 'custom': {
      const width = options?.customPaperWidth ?? 48;
      return Math.max(16, Math.min(128, Math.round(width)));
    }
    case '80mm':
    default:
      return 48;
  }
}

/**
 * Quebra linhas longas respeitando a largura da impressora
 */
function formatContentForThermal(content: string, columns: number): string[] {
  const sanitizedColumns = Math.max(16, Math.min(128, columns || 48));
  const lines: string[] = [];

  content.split('\n').forEach((rawLine) => {
    let line = rawLine ?? '';
    if (line.length <= sanitizedColumns) {
      lines.push(line);
      return;
    }

    while (line.length > sanitizedColumns) {
      lines.push(line.slice(0, sanitizedColumns));
      line = line.slice(sanitizedColumns);
    }

    if (line.length > 0) {
      lines.push(line);
    }
  });

  return lines;
}

/**
 * Resolve interface utilizada para impressão térmica
 */
function resolveThermalInterface(printerName: string, options?: PrintJobOptions): string {
  const port = options?.port?.trim();
  if (!port) {
    return `printer:${printerName}`;
  }

  const portLower = port.toLowerCase();
  if (
    portLower.startsWith('tcp://') ||
    portLower.startsWith('http://') ||
    portLower.startsWith('https://') ||
    portLower.startsWith('socket://')
  ) {
    return port;
  }

  if (
    portLower.startsWith('usb') ||
    portLower.startsWith('com') ||
    portLower.startsWith('/dev/') ||
    portLower.startsWith('lpt')
  ) {
    return port;
  }

  return `printer:${printerName}`;
}

/**
 * Converte código de status em texto amigável
 */
function mapPrinterStatus(status?: number): PrinterStatusText {
  if (status === undefined || status === null) {
    return 'unknown';
  }

  switch (status) {
    case 0:
    case 9:
    case 10:
    case 11:
    case 14:
    case 15:
    case 16:
      return 'online';
    case 1:
    case 4:
    case 5:
    case 6:
    case 7:
    case 17:
    case 18:
      return 'warning';
    case 2:
    case 20:
    case 21:
      return 'error';
    case 8:
      return 'offline';
    default:
      return 'unknown';
  }
}

/**
 * Imprime conteúdo usando node-thermal-printer (suporta ESC/POS)
 */
async function printWithThermalPrinter(
  printerName: string,
  content: string,
  options?: PrintJobOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    const interfaceTarget = resolveThermalInterface(printerName, options);
    const columns = normalizePaperWidth(options);
    const lines = formatContentForThermal(content, columns);

    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: interfaceTarget,
      options: {
        timeout: 5000,
      },
    });

    for (const line of lines) {
      printer.alignLeft();
      printer.println(line);
    }

    if (options?.autoCut !== false) {
      for (let i = 0; i < 3; i++) {
        printer.newLine();
      }
      printer.raw(Buffer.from([0x1D, 0x56, 0x00])); // GS V 0 -> corte total
    }

    const executed = await printer.execute();
    if (!executed) {
      return { success: false, error: 'Falha ao enviar dados para a impressora térmica' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao imprimir com thermal printer:', error);
    return { success: false, error: error?.message || 'Erro desconhecido ao imprimir' };
  }
}

/**
 * Imprime usando comandos do sistema operacional (fallback universal)
 */
async function printWithSystemPrinter(
  printerName: string,
  content: string,
  options?: PrintJobOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    const platform = process.platform;
    const tempFile = path.join(os.tmpdir(), `print-${Date.now()}.txt`);
    const shouldAutoCut =
      options?.autoCut !== false && (options?.paperSize ?? '80mm') !== 'a4';

    if (shouldAutoCut) {
      const contentBuffer = Buffer.from(content, 'utf8');
      const newlineBuffer = Buffer.from('\n\n', 'utf8');
      const escInit = Buffer.from([0x1B, 0x40]);
      const feedBuffer = Buffer.from([0x1B, 0x64, 0x03]); // ESC d n -> alimenta 3 linhas
      const cutFull = Buffer.from([0x1D, 0x56, 0x00]); // GS V 0 -> corte total
      const combinedBuffer = Buffer.concat([escInit, contentBuffer, newlineBuffer, feedBuffer, cutFull]);
      fs.writeFileSync(tempFile, combinedBuffer);
    } else {
      fs.writeFileSync(tempFile, content, 'utf8');
    }

    const target = options?.port?.trim() || printerName;

    if (platform === 'win32') {
      const command = `print /D:"${target}" "${tempFile}"`;
      await execAsync(command);
    } else if (platform === 'darwin') {
      const command = `lp -d "${target}" "${tempFile}"`;
      await execAsync(command);
    } else {
      const command = `lp -d "${target}" "${tempFile}"`;
      await execAsync(command);
    }

    setTimeout(() => {
      try {
        fs.unlinkSync(tempFile);
      } catch (unlinkError) {
        console.warn('Não foi possível remover arquivo temporário de impressão:', unlinkError);
      }
    }, 5000);

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao imprimir com sistema:', error);
    return { success: false, error: error?.message || 'Erro ao imprimir' };
  }
}

/**
 * Função principal de impressão que tenta múltiplos métodos
 */
async function performPrintJob(content: string, options?: PrintJobOptions): Promise<{ success: boolean; error?: string }> {
  try {
    let printerName = options?.printerName ?? null;

    if (!printerName) {
      printerName = await getDefaultPrinter();
    }

    if (!printerName) {
      return { success: false, error: 'Nenhuma impressora encontrada ou configurada' };
    }

    const jobOptions: PrintJobOptions = {
      ...options,
      printerName,
    };

    let result = await printWithThermalPrinter(printerName, content, jobOptions);
    if (result.success) {
      return result;
    }

    result = await printWithSystemPrinter(printerName, content, jobOptions);
    return result;
  } catch (error: any) {
    console.error('Erro na impressão:', error);
    return { success: false, error: error?.message || 'Erro desconhecido na impressão' };
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
      return { success: false, error: error?.message ?? 'Erro ao listar impressoras', printers: [] };
    }
  });

  // Obter impressora padrão
  ipcMain.handle('printers-get-default', async () => {
    try {
      const printerName = await getDefaultPrinter();
      const printerInfo = printerName
        ? cachedPrinters.find((printer) => printer?.name === printerName)
        : undefined;

      return {
        success: true,
        printerName,
        port: printerInfo?.port ?? null,
      };
    } catch (error: any) {
      return { success: false, error: error?.message ?? 'Erro ao obter impressora padrão', printerName: null };
    }
  });

  // Imprimir conteúdo
  ipcMain.handle('print-content', async (_event, payload: PrintContentPayload) => {
    try {
      if (!payload || typeof payload.content !== 'string') {
        return { success: false, error: 'Conteúdo de impressão inválido' };
      }

      const result = await performPrintJob(payload.content, payload.options);
      return result;
    } catch (error: any) {
      return { success: false, error: error?.message || 'Erro desconhecido' };
    }
  });

  // Testar impressora
  ipcMain.handle('printers-test', async (_event, payload: string | PrintJobOptions | null) => {
    try {
      let options: PrintJobOptions = {};

      if (typeof payload === 'string' || payload === null) {
        options.printerName = payload ?? null;
      } else if (typeof payload === 'object' && payload !== null) {
        options = { ...payload };
      }

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
      
      const result = await performPrintJob(testContent, options);
      return result;
    } catch (error: any) {
      return { success: false, error: error?.message || 'Erro ao testar impressora' };
    }
  });
}

