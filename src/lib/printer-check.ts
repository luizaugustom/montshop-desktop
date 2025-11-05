import { useDeviceStore } from '../store/device-store';

/**
 * Verifica o status das impressoras e atualiza o store
 * Esta função pode ser chamada:
 * - Ao fazer login
 * - Ao clicar em um botão manual de atualização
 * 
 * NOTA: Configuração de impressoras removida - função desabilitada
 */
export async function checkPrinterStatus() {
  const { setPrinterStatus, setPrinterName } = useDeviceStore.getState();
  
  try {
    setPrinterStatus('checking');
    
    // Configuração de impressoras removida - não buscar mais do backend
    setPrinterStatus('disconnected');
    setPrinterName(null);
    return {
      success: false,
      message: 'Configuração de impressoras foi removida do sistema'
    };
  } catch (error) {
    setPrinterStatus('disconnected');
    setPrinterName(null);
    return {
      success: false,
      message: 'Erro ao verificar status das impressoras'
    };
  }
}

