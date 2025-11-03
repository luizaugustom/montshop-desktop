import { printerApi } from './api-endpoints';
import { useDeviceStore } from '../store/device-store';

/**
 * Verifica o status das impressoras e atualiza o store
 * Esta função pode ser chamada:
 * - Ao fazer login
 * - Ao clicar em um botão manual de atualização
 */
export async function checkPrinterStatus() {
  const { setPrinterStatus, setPrinterName } = useDeviceStore.getState();
  
  try {
    setPrinterStatus('checking');
    
    // Buscar impressoras cadastradas
    const response = await printerApi.list();
    const printers = response.data?.printers || response.data || [];
    
    // Encontrar impressora padrão
    const printer = printers.find((p: any) => p.isDefault) || printers[0];
    
    if (!printer) {
      setPrinterStatus('disconnected');
      setPrinterName(null);
      return {
        success: false,
        message: 'Nenhuma impressora cadastrada'
      };
    }

    setPrinterName(printer.name);

    // Verificar status da impressora
    try {
      // Tentar buscar status específico da impressora, se disponível
      let status: any = { connected: printer.isConnected };
      
      try {
        if (printer.id) {
          const statusResponse = await printerApi.status(printer.id);
          status = statusResponse.data || statusResponse;
        } else {
          // Se não houver ID, usar dados básicos
          status = { connected: printer.isConnected, isConnected: printer.isConnected };
        }
      } catch {
        // Se não houver endpoint de status, usar dados básicos
        status = { connected: printer.isConnected, isConnected: printer.isConnected };
      }
      
      if (status.connected || status.status === 'online' || status.status === 'ready' || status.isConnected) {
        setPrinterStatus('connected');
        return {
          success: true,
          message: `Impressora ${printer.name} conectada`,
          printer
        };
      } else {
        setPrinterStatus('error');
        return {
          success: false,
          message: `Impressora ${printer.name} com erro`,
          printer
        };
      }
    } catch (statusError) {
      setPrinterStatus('error');
      return {
        success: false,
        message: `Erro ao verificar status da impressora ${printer.name}`,
        printer
      };
    }
  } catch (error) {
    // Se não houver impressoras cadastradas
    setPrinterStatus('disconnected');
    setPrinterName(null);
    return {
      success: false,
      message: 'Erro ao buscar impressoras'
    };
  }
}

