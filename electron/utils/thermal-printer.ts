/**
 * Utilitário para impressão térmica usando node-thermal-printer
 * Suporta múltiplas marcas e modelos
 */

import { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } from 'node-thermal-printer';

export interface PrinterConfig {
  type: PrinterTypes;
  interface: string; // 'printer' | 'file' | 'tcp' | 'tcp:ip:port'
  characterSet?: CharacterSet;
  breakLine?: BreakLine;
  width?: number;
}

export async function printThermal(content: string, config: PrinterConfig): Promise<void> {
  try {
    const printer = new ThermalPrinter({
      type: config.type,
      interface: config.interface,
      characterSet: config.characterSet || CharacterSet.PC852_LATIN2,
      breakLine: config.breakLine || BreakLine.WORD,
      width: config.width || 48,
    });

    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      throw new Error('Impressora não está conectada');
    }

    printer.alignCenter();
    printer.setTextSize(1, 1);
    printer.println(content);
    printer.cut();
    
    await printer.execute();
  } catch (error: any) {
    throw new Error(`Erro na impressão: ${error.message}`);
  }
}

// Mapeamento de marcas para tipos de impressora
export function getPrinterType(brand: string, model: string): PrinterTypes {
  const brandLower = brand.toLowerCase();
  const modelLower = model.toLowerCase();

  // EPSON
  if (brandLower.includes('epson')) {
    if (modelLower.includes('tm-t20')) return PrinterTypes.EPSON;
    if (modelLower.includes('tm-t82')) return PrinterTypes.EPSON;
    if (modelLower.includes('tm-t88')) return PrinterTypes.EPSON;
    return PrinterTypes.EPSON;
  }

  // Bematech
  if (brandLower.includes('bematech')) {
    return PrinterTypes.BEMATECH;
  }

  // Daruma
  if (brandLower.includes('daruma')) {
    return PrinterTypes.DARUMA;
  }

  // Elgin
  if (brandLower.includes('elgin')) {
    return PrinterTypes.ELGIN;
  }

  // Star Micronics
  if (brandLower.includes('star')) {
    return PrinterTypes.STAR;
  }

  // Zebra
  if (brandLower.includes('zebra')) {
    return PrinterTypes.ZEBRA;
  }

  // Bixolon
  if (brandLower.includes('bixolon')) {
    return PrinterTypes.BIXOLON;
  }

  // Genérico ESC/POS
  return PrinterTypes.EPSON; // EPSON é compatível com ESC/POS genérico
}

// Função auxiliar para detectar interface da impressora
export function detectPrinterInterface(printerName: string, port?: string): string {
  if (port) {
    // Se tem porta, pode ser USB ou serial
    if (port.toLowerCase().includes('usb') || port.toLowerCase().includes('com')) {
      return `printer:${port}`;
    }
    if (port.includes(':')) {
      // TCP/IP
      return `tcp:${port}`;
    }
  }

  // Fallback: usar nome da impressora como interface
  return `printer:${printerName}`;
}

