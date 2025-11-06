import type { PaperSizeOption } from './print-settings';

/**
 * Serviço de impressão universal que funciona tanto no desktop (Electron) quanto na web
 * Versão para desktop (montshop-desktop)
 */

export interface PrintJobOptions {
  printerName?: string | null;
  port?: string | null;
  paperSize?: PaperSizeOption;
  customPaperWidth?: number | null;
  autoCut?: boolean;
}

/**
 * Detecta se está rodando no Electron (desktop)
 */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
}

function getWebPaperStyle(paperSize: PaperSizeOption = '80mm', customPaperWidth?: number | null) {
  switch (paperSize) {
    case '58mm':
      return {
        pageSize: '58mm auto',
        padding: '4mm',
        width: '52mm',
      };
    case 'a4':
      return {
        pageSize: '210mm 297mm',
        padding: '12mm',
        width: '180mm',
      };
    case 'custom': {
      const columns = customPaperWidth ?? 48;
      const widthMm = Math.max(45, Math.min(120, Math.round(columns * 1.7)));
      return {
        pageSize: `${widthMm}mm auto`,
        padding: '4mm',
        width: `${Math.max(widthMm - 6, 40)}mm`,
      };
    }
    case '80mm':
    default:
      return {
        pageSize: '80mm auto',
        padding: '5mm',
        width: '70mm',
      };
  }
}

/**
 * Formata conteúdo de texto para impressão HTML (web)
 */
function formatContentForWeb(
  content: string,
  paperSize: PaperSizeOption = '80mm',
  customPaperWidth?: number | null
): string {
  const htmlContent = content
    .split('\n')
    .map((line) => {
      const formattedLine = line.replace(/ /g, '&nbsp;');
      return `<div style="font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.2; white-space: pre-wrap;">${formattedLine}</div>`;
    })
    .join('');

  const paperStyle = getWebPaperStyle(paperSize, customPaperWidth);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Impressão de Cupom</title>
      <style>
        @media print {
          @page {
            size: ${paperStyle.pageSize};
            margin: 0;
          }
          body {
            margin: 0;
            padding: ${paperStyle.padding};
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.2;
            width: ${paperStyle.width};
          }
        }
        body {
          margin: 0;
          padding: ${paperStyle.padding};
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.2;
          width: ${paperStyle.width};
          background: white;
        }
        .content {
          white-space: pre-wrap;
          word-wrap: break-word;
        }
      </style>
    </head>
    <body>
      <div class="content">${htmlContent}</div>
    </body>
    </html>
  `;
}

/**
 * Imprime conteúdo no navegador usando window.print
 */
async function printInBrowser(
  content: string,
  options?: PrintJobOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    // Criar janela de impressão
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      return { success: false, error: 'Não foi possível abrir janela de impressão. Verifique se os pop-ups estão bloqueados.' };
    }

    // Formatar conteúdo para HTML
    const htmlContent = formatContentForWeb(
      content,
      options?.paperSize,
      options?.customPaperWidth
    );

    // Escrever conteúdo na janela
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Aguardar carregamento e imprimir
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        // Fechar janela após impressão
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      }, 250);
    };

    // Se já carregou, imprimir imediatamente
    if (printWindow.document.readyState === 'complete') {
      setTimeout(() => {
        printWindow.print();
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      }, 250);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao imprimir no navegador:', error);
    return { success: false, error: error.message || 'Erro ao imprimir' };
  }
}

/**
 * Imprime conteúdo usando Electron (desktop)
 */
async function printInElectron(
  content: string,
  options?: PrintJobOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!window.electronAPI?.printers) {
      return { success: false, error: 'API de impressão não disponível' };
    }

    const result = await window.electronAPI.printers.print({
      content,
      options,
    });
    return result;
  } catch (error: any) {
    console.error('Erro ao imprimir no Electron:', error);
    return { success: false, error: error.message || 'Erro ao imprimir' };
  }
}

/**
 * Função principal de impressão
 * Funciona tanto no desktop quanto na web
 */
export async function printContent(
  content: string,
  printerOrOptions?: string | null | PrintJobOptions
): Promise<{ success: boolean; error?: string }> {
  const options = normalizePrintOptions(printerOrOptions);

  try {
    if (isElectron()) {
      // Desktop: usar Electron
      return await printInElectron(content, options);
    } else {
      // Web: usar window.print
      return await printInBrowser(content, options);
    }
  } catch (error: any) {
    console.error('Erro na impressão:', error);
    return { success: false, error: error.message || 'Erro desconhecido na impressão' };
  }
}

/**
 * Lista impressoras disponíveis (apenas desktop)
 */
export async function listPrinters(): Promise<{ success: boolean; printers?: any[]; error?: string }> {
  if (!isElectron() || !window.electronAPI?.printers) {
    return { success: false, printers: [], error: 'Não disponível na web' };
  }

  try {
    const result = await window.electronAPI.printers.list();
    // O resultado pode ser um array ou um objeto com success/printers
    if (Array.isArray(result)) {
      return { success: true, printers: result };
    }
    return result as { success: boolean; printers?: any[]; error?: string };
  } catch (error: any) {
    return { success: false, printers: [], error: error.message };
  }
}

/**
 * Obtém impressora padrão (apenas desktop)
 */
export async function getDefaultPrinter(): Promise<{
  success: boolean;
  printerName?: string | null;
  port?: string | null;
  error?: string;
}> {
  if (!isElectron() || !window.electronAPI?.printers) {
    return { success: false, printerName: null, port: null, error: 'Não disponível na web' };
  }

  try {
    return await window.electronAPI.printers.getDefault();
  } catch (error: any) {
    return { success: false, printerName: null, port: null, error: error.message };
  }
}

/**
 * Testa impressora (apenas desktop)
 */
export async function testPrinter(printerName?: string | null): Promise<{ success: boolean; error?: string }> {
  if (!isElectron() || !window.electronAPI?.printers) {
    return { success: false, error: 'Não disponível na web' };
  }

  try {
    return await window.electronAPI.printers.test(printerName || null);
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function normalizePrintOptions(
  printerOrOptions?: string | null | PrintJobOptions
): PrintJobOptions | undefined {
  if (printerOrOptions === undefined) {
    return undefined;
  }

  if (typeof printerOrOptions === 'string' || printerOrOptions === null) {
    return {
      printerName: printerOrOptions ?? null,
      paperSize: '80mm',
      customPaperWidth: null,
      autoCut: true,
    };
  }

  const paperSize: PaperSizeOption =
    printerOrOptions.paperSize && ['80mm', '58mm', 'a4', 'custom'].includes(printerOrOptions.paperSize)
      ? printerOrOptions.paperSize
      : '80mm';

  const rawCustomWidth = printerOrOptions.customPaperWidth;
  let customPaperWidth: number | null = null;
  if (paperSize === 'custom') {
    if (typeof rawCustomWidth === 'number' && Number.isFinite(rawCustomWidth)) {
      customPaperWidth = Math.max(16, Math.min(128, Math.round(rawCustomWidth)));
    } else if (rawCustomWidth !== null && rawCustomWidth !== undefined) {
      const parsed = Number(rawCustomWidth);
      customPaperWidth = Number.isFinite(parsed)
        ? Math.max(16, Math.min(128, Math.round(parsed)))
        : 48;
    } else {
      customPaperWidth = 48;
    }
  }

  return {
    printerName: printerOrOptions.printerName ?? null,
    port: printerOrOptions.port ?? null,
    paperSize,
    customPaperWidth,
    autoCut: printerOrOptions.autoCut !== false,
  };
}

