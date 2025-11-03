/**
 * Funções para impressão local no desktop usando Electron
 */

/**
 * Obtém a impressora padrão ou primeira impressora disponível
 */
async function getDefaultPrinter(): Promise<string | null> {
  if (!window.electronAPI?.printers?.getDefault) {
    console.warn('[LocalPrinter] Electron API não disponível');
    return null;
  }

  try {
    const defaultPrinter = await window.electronAPI.printers.getDefault();
    if (defaultPrinter) {
      return defaultPrinter;
    }

    // Se não houver padrão, buscar a primeira impressora disponível
    const printers = await window.electronAPI.printers.list();
    if (Array.isArray(printers) && printers.length > 0) {
      return printers[0].name || printers[0].Name || null;
    }

    return null;
  } catch (error) {
    console.error('[LocalPrinter] Erro ao obter impressora padrão:', error);
    return null;
  }
}

/**
 * Imprime conteúdo localmente usando Electron
 */
export async function printLocal(content: string, printerName?: string): Promise<boolean> {
  try {
    // Se não foi especificada uma impressora, usar a padrão
    let targetPrinter = printerName;
    let printerInfo: any = null;
    
    if (!targetPrinter) {
      targetPrinter = await getDefaultPrinter();
    }

    if (!targetPrinter) {
      throw new Error('Nenhuma impressora disponível. Conecte uma impressora ao computador.');
    }

    // Obter informações da impressora para detecção automática de marca/modelo
    if (window.electronAPI?.printers?.list) {
      try {
        const printers = await window.electronAPI.printers.list();
        printerInfo = printers.find((p: any) => 
          (p.name || p.Name) === targetPrinter
        );
      } catch (error) {
        console.warn('[LocalPrinter] Erro ao obter informações da impressora:', error);
      }
    }

    if (!window.electronAPI?.printers?.print) {
      throw new Error('API de impressão não disponível. Use o aplicativo desktop.');
    }

    console.log(`[LocalPrinter] Imprimindo na impressora: ${targetPrinter}`);
    
    // Passar informações da impressora se disponíveis
    const options = printerInfo ? {
      brand: printerInfo.driver || printerInfo.DriverName || undefined,
      model: undefined, // Pode ser extraído do driver se necessário
      port: printerInfo.port || printerInfo.PortName || undefined,
    } : undefined;
    
    await window.electronAPI.printers.print(targetPrinter, content, options);
    
    console.log('[LocalPrinter] Impressão concluída com sucesso');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao imprimir';
    console.error('[LocalPrinter] Erro ao imprimir:', error);
    throw new Error(`Erro ao imprimir: ${errorMessage}`);
  }
}

/**
 * Verifica se a impressão local está disponível
 */
export function isLocalPrintingAvailable(): boolean {
  return !!window.electronAPI?.printers?.print;
}

