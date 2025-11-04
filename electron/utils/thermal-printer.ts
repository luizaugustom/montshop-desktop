/**
 * Utilitário profissional para impressão térmica
 * Implementação robusta baseada em sistemas de PDV comerciais
 * Suporta múltiplas marcas e modelos de impressoras térmicas
 */

import { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } from 'node-thermal-printer';

// Imports opcionais para ESC/POS (fallback)
let escpos: any;
let escposUSB: any;
let escposNetwork: any;

try {
  escpos = require('escpos');
  escposUSB = require('escpos-usb');
  escposNetwork = require('escpos-network');
  
  // Registrar adaptadores USB e Network se disponíveis
  if (escpos && escposUSB && escposNetwork) {
    escpos.USB = escposUSB;
    escpos.Network = escposNetwork;
  }
} catch (error) {
  console.warn('Bibliotecas ESC/POS não disponíveis, usando apenas node-thermal-printer');
}

export interface PrinterConfig {
  name: string;
  type?: PrinterTypes;
  interface?: 'printer' | 'usb' | 'tcp';
  characterSet?: CharacterSet;
  breakLine?: BreakLine;
  width?: number;
  port?: string;
  address?: string;
  driver?: string;
  connection?: 'usb' | 'network' | 'bluetooth' | 'local';
}

export interface PrintOptions {
  cutPaper?: boolean;
  openCashDrawer?: boolean;
  encoding?: 'utf8' | 'latin1' | 'cp850';
}

/**
 * Detecta o tipo de impressora baseado no nome e driver
 */
export function detectPrinterType(printerName: string, driverName?: string): PrinterTypes {
  const name = printerName.toLowerCase();
  const driver = (driverName || '').toLowerCase();

  // EPSON (mais comum, compatível com ESC/POS genérico)
  if (name.includes('epson') || driver.includes('epson') || 
      name.includes('tm-') || driver.includes('tm-')) {
    if (name.includes('tm-t20') || driver.includes('tm-t20')) return PrinterTypes.EPSON;
    if (name.includes('tm-t82') || driver.includes('tm-t82')) return PrinterTypes.EPSON;
    if (name.includes('tm-t88') || driver.includes('tm-t88')) return PrinterTypes.EPSON;
    return PrinterTypes.EPSON; // Padrão EPSON
  }

  // Bematech
  if (name.includes('bematech') || driver.includes('bematech') ||
      name.includes('mp-') || driver.includes('mp-')) {
    return PrinterTypes.BEMATECH;
  }

  // Daruma
  if (name.includes('daruma') || driver.includes('daruma') ||
      name.includes('dr-') || driver.includes('dr-')) {
    return PrinterTypes.DARUMA;
  }

  // Elgin
  if (name.includes('elgin') || driver.includes('elgin') ||
      name.includes('i9') || name.includes('i7') ||
      driver.includes('i9') || driver.includes('i7')) {
    return PrinterTypes.ELGIN;
  }

  // Star Micronics
  if (name.includes('star') || driver.includes('star')) {
    return PrinterTypes.STAR;
  }

  // Zebra
  if (name.includes('zebra') || driver.includes('zebra')) {
    return PrinterTypes.ZEBRA;
  }

  // Bixolon
  if (name.includes('bixolon') || driver.includes('bixolon')) {
    return PrinterTypes.BIXOLON;
  }

  // Padrão: EPSON (compatível com ESC/POS genérico)
  return PrinterTypes.EPSON;
}

/**
 * Detecta interface da impressora (USB, Network, Printer)
 */
export function detectPrinterInterface(
  printerName: string,
  port?: string,
  connection?: 'usb' | 'network' | 'bluetooth' | 'local'
): { type: 'printer' | 'usb' | 'tcp'; interface: string } {
  // Se especificar porta TCP/IP
  if (port && (port.includes(':') || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(port))) {
    const address = port.includes(':') ? port : `${port}:9100`;
    return { type: 'tcp', interface: address };
  }

  // Se for rede
  if (connection === 'network' || (port && port.toLowerCase().includes('tcp'))) {
    const address = port || `${printerName}:9100`;
    return { type: 'tcp', interface: address };
  }

  // Se for USB
  if (connection === 'usb' || (port && port.toLowerCase().includes('usb'))) {
    // Extrair número da porta USB se disponível
    const usbMatch = port?.match(/usb(\d+)/i);
    if (usbMatch) {
      return { type: 'usb', interface: `usb${usbMatch[1]}` };
    }
    return { type: 'usb', interface: 'usb' };
  }

  // Padrão: usar nome da impressora (sistema operacional)
  return { type: 'printer', interface: printerName };
}

/**
 * Imprime usando node-thermal-printer (recomendado)
 */
export async function printWithNodeThermal(
  content: string,
  config: PrinterConfig,
  options: PrintOptions = {}
): Promise<void> {
  try {
    const printerType = config.type || detectPrinterType(config.name, (config as any).driver);
    const { type, interface: printerInterface } = config.interface && config.port
      ? { type: config.interface as any, interface: config.port }
      : detectPrinterInterface(config.name, config.port, (config as any).connection as any);

    const printer = new ThermalPrinter({
      type: printerType,
      interface: printerInterface || config.name,
      characterSet: config.characterSet || CharacterSet.PC852_LATIN2, // Suporte para acentos
      breakLine: config.breakLine || BreakLine.WORD,
      width: config.width || 48, // 48mm (padrão para cupons)
      removeSpecialCharacters: false,
    });

    // Verificar conexão
    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      throw new Error(`Impressora "${config.name}" não está conectada ou acessível`);
    }

    // Definir encoding correto
    if (options.encoding === 'cp850') {
      // Converter para CP850 se necessário
      content = Buffer.from(content, 'utf8').toString('latin1');
    }

    // Enviar conteúdo
    printer.clear();
    printer.alignLeft();
    printer.println(content);

    // Cortar papel
    if (options.cutPaper !== false) {
      printer.cut();
    }

    // Abrir gaveta
    if (options.openCashDrawer) {
      printer.openCashDrawer();
    }

    // Executar impressão
    await printer.execute();
  } catch (error: any) {
    throw new Error(`Erro na impressão: ${error.message}`);
  }
}

/**
 * Imprime usando ESC/POS nativo (fallback mais confiável)
 */
export async function printWithEscPos(
  content: string,
  config: PrinterConfig,
  options: PrintOptions = {}
): Promise<void> {
  if (!escpos) {
    throw new Error('Biblioteca ESC/POS não disponível');
  }
  
  return new Promise((resolve, reject) => {
    try {
      const { type, interface: printerInterface } = detectPrinterInterface(
        config.name,
        config.port,
        config.connection as any
      );

      let device: any;

      // Criar dispositivo baseado no tipo
      if (type === 'tcp') {
        const [address, port] = printerInterface.split(':');
        device = new escpos.Network(address, parseInt(port || '9100'));
      } else if (type === 'usb') {
        // Para USB, precisamos do vendorId e productId
        // Por enquanto, usar interface 'printer'
        device = new escpos.USB();
      } else {
        // Usar interface do sistema operacional
        device = new escpos.USB();
      }

      device.open((error: Error) => {
        if (error) {
          // Fallback: tentar com nome da impressora
          const Printer = escpos.Printer;
          const network = new escpos.Network(config.name);
          
          network.open((err: Error) => {
            if (err) {
              reject(new Error(`Não foi possível conectar à impressora: ${err.message}`));
              return;
            }

            const printer = new Printer(network, {
              encoding: 'CP850', // Melhor compatibilidade com caracteres especiais
              width: 48,
            });

            printer
              .font('A')
              .align('LT')
              .text(content);

            if (options.cutPaper !== false) {
              printer.cut();
            }

            if (options.openCashDrawer) {
              printer.cashdraw(2);
            }

            printer.close((closeErr: Error) => {
              if (closeErr) {
                reject(new Error(`Erro ao fechar impressora: ${closeErr.message}`));
              } else {
                resolve();
              }
            });
          });
        } else {
          const Printer = escpos.Printer;
          const printer = new Printer(device, {
            encoding: 'CP850',
            width: 48,
          });

          printer
            .font('A')
            .align('LT')
            .text(content);

          if (options.cutPaper !== false) {
            printer.cut();
          }

          if (options.openCashDrawer) {
            printer.cashdraw(2);
          }

          printer.close((closeErr: Error) => {
            if (closeErr) {
              reject(new Error(`Erro ao fechar impressora: ${closeErr.message}`));
            } else {
              resolve();
            }
          });
        }
      });
    } catch (error: any) {
      reject(new Error(`Erro na impressão ESC/POS: ${error.message}`));
    }
  });
}

/**
 * Função principal de impressão (tenta node-thermal-printer primeiro, depois ESC/POS)
 */
export async function printThermal(
  content: string,
  config: PrinterConfig,
  options: PrintOptions = {}
): Promise<void> {
  // Tentar primeiro com node-thermal-printer
  try {
    await printWithNodeThermal(content, config, options);
    return;
  } catch (error: any) {
    console.warn('Falha ao imprimir com node-thermal-printer, tentando ESC/POS:', error.message);
    
    // Fallback para ESC/POS
    try {
      await printWithEscPos(content, config, options);
      return;
    } catch (escPosError: any) {
      throw new Error(
        `Falha em ambos os métodos de impressão:\n` +
        `node-thermal-printer: ${error.message}\n` +
        `ESC/POS: ${escPosError.message}`
      );
    }
  }
}

/**
 * Gera comandos ESC/POS para formatação de texto
 */
export class EscPosFormatter {
  // Comandos básicos
  static ESC = '\x1B';
  static GS = '\x1D';

  // Inicializar impressora
  static init(): string {
    return `${this.ESC}@`;
  }

  // Alinhamento
  static alignLeft(): string {
    return `${this.ESC}a\x00`;
  }

  static alignCenter(): string {
    return `${this.ESC}a\x01`;
  }

  static alignRight(): string {
    return `${this.ESC}a\x02`;
  }

  // Negrito
  static bold(on: boolean): string {
    return `${this.ESC}E${on ? '\x01' : '\x00'}`;
  }

  // Tamanho da fonte
  static fontSize(width: number = 1, height: number = 1): string {
    // width e height: 0-7 (bits 0-2 e 4-6)
    const size = ((height & 7) << 4) | (width & 7);
    return `${this.GS}!${String.fromCharCode(size)}`;
  }

  // Corte de papel
  static cutPartial(): string {
    return `${this.GS}V\x41\x03`;
  }

  static cutFull(): string {
    return `${this.GS}V\x41\x00`;
  }

  // Abrir gaveta
  static openCashDrawer(): string {
    return `${this.ESC}p\x00\x32\xC8`; // ESC p 0 50 200
  }

  // Quebra de linha
  static newLine(count: number = 1): string {
    return '\n'.repeat(count);
  }

  // Formatar texto centralizado
  static centerText(text: string, width: number = 48): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  // Separador
  static separator(char: string = '=', width: number = 48): string {
    return char.repeat(width);
  }
}

