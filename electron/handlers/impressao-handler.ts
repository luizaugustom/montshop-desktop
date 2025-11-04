import { ipcMain } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import { promises as fs } from 'fs';
import * as path from 'path';
import { 
  printThermal, 
  detectPrinterType, 
  detectPrinterInterface,
  type PrinterConfig 
} from '../utils/thermal-printer';

const execAsync = promisify(exec);

/**
 * Formata uma nota fiscal para impressão
 */
function formatarNota(nota: any): string {
  const data = nota.data || new Date().toLocaleDateString('pt-BR');
  const cliente = nota.cliente || 'Cliente não informado';
  const valor = nota.valor || '0,00';
  
  let conteudo = `
================================
      CUPOM FISCAL
================================

Cliente: ${cliente}
Data: ${data}

--------------------------------
ITENS
--------------------------------
`;

  if (nota.itens && Array.isArray(nota.itens)) {
    nota.itens.forEach((item: any) => {
      const qtd = item.qtd || 1;
      const nome = item.nome || 'Produto';
      const preco = item.preco || '0,00';
      conteudo += `${qtd}x ${nome.padEnd(20)} ${preco}\n`;
    });
  }

  conteudo += `
--------------------------------
TOTAL: ${valor}
================================

Obrigado pela preferência!

`;

  return conteudo;
}

/**
 * Obtém informações da impressora padrão
 */
async function obterImpressoraPadrao(): Promise<{ name: string; driver?: string; port?: string } | null> {
  try {
    if (process.platform === 'win32') {
      const psCommand = `
        $printer = Get-Printer | Where-Object {$_.Default -eq $true} | Select-Object -First 1;
        if ($printer) {
          @{
            Name = $printer.Name;
            DriverName = $printer.DriverName;
            PortName = $printer.PortName
          } | ConvertTo-Json -Compress
        }
      `;
      const { stdout } = await execAsync(
        `powershell -Command "${psCommand.replace(/\n/g, ' ')}"`
      );
      
      if (stdout && stdout.trim()) {
        const printer = JSON.parse(stdout);
        return {
          name: printer.Name,
          driver: printer.DriverName,
          port: printer.PortName
        };
      }
    } else {
      const { stdout } = await execAsync('lpstat -d');
      const match = stdout.match(/system default destination: (.+)/);
      if (match) {
        return { name: match[1] };
      }
    }
  } catch (error) {
    console.warn('Não foi possível obter impressora padrão:', error);
  }
  return null;
}

/**
 * Imprime uma nota fiscal usando a infraestrutura completa de impressão existente
 * Preserva todas as funcionalidades: impressão térmica, detecção automática e fallback
 */
async function printNota(nota: any): Promise<void> {
  const conteudo = formatarNota(nota);
  
  const printerInfo = await obterImpressoraPadrao();
  
  if (!printerInfo) {
    throw new Error('Nenhuma impressora padrão encontrada');
  }

  const printerName = printerInfo.name;
  const detectedBrand = printerInfo.driver;
  const detectedPort = printerInfo.port;

  // Verificar se é impressora térmica (usando a mesma lógica do printer-handlers)
  const isThermalPrinter = detectedBrand || 
    printerName.toLowerCase().match(/epson|bematech|elgin|daruma|star|zebra|thermal|térmica/i);
  
  if (isThermalPrinter) {
    try {
      // Usar a infraestrutura de impressão térmica existente
      const printerType = detectPrinterType(printerName, detectedBrand);
      const { type: interfaceType, interface: printerInterface } = detectPrinterInterface(
        printerName,
        detectedPort,
        detectedPort?.toLowerCase().includes('usb') ? 'usb' :
        detectedPort?.toLowerCase().includes('tcp') ? 'network' : undefined
      );
      
      const config: PrinterConfig = {
        name: printerName,
        type: printerType,
        interface: interfaceType,
        port: detectedPort,
        driver: detectedBrand,
      };

      console.log('[ImpressaoHandler] Tentando impressão térmica:', config);
      await printThermal(conteudo, config, {
        cutPaper: true,
        encoding: 'utf8',
      });
      console.log('[ImpressaoHandler] ✅ Impressão térmica concluída com sucesso');
      return; // Sucesso na impressão térmica
    } catch (thermalError: any) {
      console.warn('[ImpressaoHandler] ⚠️ Falha na impressão térmica, tentando método genérico:', thermalError.message);
      // Continuar com método genérico (fallback)
    }
  }

  // Método genérico (fallback) - mesma lógica do printer-handlers
  console.log('[ImpressaoHandler] Usando método genérico de impressão');
  if (process.platform === 'win32') {
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `montshop-nota-${Date.now()}.txt`);
    
    try {
      await fs.writeFile(tmpFile, conteudo, { encoding: 'utf8' });
      const psCommand = `Get-Content -Path '${tmpFile.replace(/'/g, "''")}' -Encoding UTF8 | Out-Printer -Name "${printerName}"`;
      await execAsync(`powershell -Command "${psCommand}"`);
      await fs.unlink(tmpFile).catch(() => {});
    } catch (fileError: any) {
      await fs.unlink(tmpFile).catch(() => {});
      const escapedContent = conteudo.replace(/'/g, "''").replace(/\$/g, '`$').replace(/`/g, '``');
      const psCommand = `"${escapedContent}" | Out-Printer -Name "${printerName}"`;
      await execAsync(`powershell -Command "${psCommand}"`);
    }
  } else {
    await execAsync(`echo "${conteudo.replace(/"/g, '\\"')}" | lpr -P "${printerName}"`);
  }
  
  console.log('[ImpressaoHandler] Impressão genérica concluída com sucesso');
}

ipcMain.handle('imprimir-nota', async (event, nota) => {
  try {
    await printNota(nota);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro desconhecido' };
  }
});
