import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { printerApi, scaleApi } from '../lib/api-endpoints';

// Função para obter computerId
async function getComputerId(): Promise<string> {
  if (window.electronAPI) {
    return await window.electronAPI.devices.getComputerId();
  }
  // Fallback: gerar um ID único se não houver Electron API
  let id = localStorage.getItem('montshop_computer_id');
  if (!id) {
    id = `browser-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('montshop_computer_id', id);
  }
  return id;
}

interface Printer {
  name: string;
  status: string;
  DriverName?: string;
  id?: string;
  isDefault?: boolean;
  isConnected?: boolean;
  connection?: string;
  port?: string;
  driver?: string;
  paperStatus?: string;
  lastStatusCheck?: string | Date;
}

interface Scale {
  DeviceID: string;
  Description: string;
  Name: string;
}

interface DeviceContextValue {
  printers: Printer[];
  scales: Scale[];
  computerId: string | null;
  loading: boolean;
  refreshPrinters: () => Promise<void>;
  refreshScales: () => Promise<void>;
}

const DeviceContext = createContext<DeviceContextValue | undefined>(undefined);

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [scales, setScales] = useState<Scale[]>([]);
  const [computerId, setComputerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { api, isAuthenticated } = useAuth();

  const refreshPrinters = async () => {
    // SEMPRE usar impressoras locais como fonte principal
    let systemPrinters: any[] = [];
    
    if (window.electronAPI?.printers?.list) {
      try {
        const localPrinters = await window.electronAPI.printers.list();
        if (Array.isArray(localPrinters)) {
          systemPrinters = localPrinters;
          console.log(`[DeviceContext] ${systemPrinters.length} impressora(s) encontrada(s) no sistema local`);
        }
      } catch (error) {
        console.error('[DeviceContext] Erro ao buscar impressoras do sistema local:', error);
      }
    }

    // Verificar status detalhado de cada impressora local
    const formattedPrinters: Printer[] = await Promise.all(
      systemPrinters.map(async (localPrinter: any) => {
        const printerName = localPrinter.name || localPrinter.Name || 'Impressora desconhecida';
        let isConnected: boolean | undefined = undefined;
        let paperStatus: string | undefined = undefined;
        
        // Verificar status detalhado se disponível
        if (window.electronAPI?.printers?.checkStatus) {
          try {
            const status = await window.electronAPI.printers.checkStatus(printerName);
            isConnected = status.online ?? isConnected;
            // Mapear status de papel baseado no resultado
            if (status.error) {
              paperStatus = 'ERROR';
            } else if (status.paperOk === false) {
              paperStatus = 'EMPTY';
            } else if (status.paperOk === true) {
              paperStatus = 'OK';
            }
          } catch (error) {
            console.warn(`[DeviceContext] Erro ao verificar status de ${printerName}:`, error);
          }
        }
        
        // Determinar status baseado no PrinterStatus do Windows ou status já calculado
        let status = 'offline';
        if (localPrinter.PrinterStatus !== undefined) {
          // Windows PrinterStatus:
          // 0 = Other
          // 2 = Idle (Online)
          // 3 = Printing
          // 4 = WarmUp
          // 5 = Stopped Printing
          // 6 = Offline
          // 8 = Error
          const printerStatus = localPrinter.PrinterStatus;
          if (printerStatus === 2 || printerStatus === 3 || printerStatus === 4) {
            status = 'online';
          } else if (printerStatus === 6 || printerStatus === 0 || printerStatus === 1) {
            status = 'offline';
          } else if (printerStatus === 8 || printerStatus === 5) {
            status = 'error';
          }
        } else if (localPrinter.status) {
          status = localPrinter.status;
        }
        
        // Atualizar status baseado na verificação detalhada se disponível
        if (isConnected !== undefined) {
          status = isConnected ? 'online' : 'offline';
        } else {
          // Se não conseguiu verificar, usar status baseado no PrinterStatus
          isConnected = status === 'online';
        }
        
        return {
          name: printerName,
          status,
          DriverName: localPrinter.driver || localPrinter.DriverName || 'Unknown',
          id: localPrinter.id,
          isDefault: localPrinter.isDefault || localPrinter.IsDefault || false,
          isConnected: isConnected ?? false,
          connection: localPrinter.connection || (localPrinter.PortName?.toLowerCase().includes('usb') ? 'usb' : 
                   localPrinter.PortName?.toLowerCase().includes('bluetooth') ? 'bluetooth' : 'network'),
          port: localPrinter.port || localPrinter.PortName || 'Unknown',
          driver: localPrinter.driver || localPrinter.DriverName || 'Unknown',
          paperStatus,
          lastStatusCheck: new Date(),
        };
      })
    );

    // Sincronizar com backend se autenticado (apenas para persistência, não para status)
    if (isAuthenticated && systemPrinters.length > 0) {
      try {
        const id = computerId || await getComputerId();
        await printerApi.registerDevices({
          computerId: id,
          printers: systemPrinters.map((p: any) => ({
            name: p.name || p.Name || 'Impressora desconhecida',
            driver: p.driver || p.DriverName || 'Unknown',
            port: p.port || p.PortName || 'Unknown',
            status: p.status || (p.PrinterStatus === 0 ? 'online' : 'offline'),
            isDefault: p.isDefault || p.IsDefault || false,
            connection: p.connection || (p.PortName?.toLowerCase().includes('usb') ? 'usb' : 'network'),
          })),
        });
      } catch (error: any) {
        // Ignora erros de sincronização, não é crítico
        if (error?.response?.status !== 403) {
          console.warn('[DeviceContext] Erro ao sincronizar impressoras:', error);
        }
      }
    }
    
    setPrinters(formattedPrinters);
  };

  const refreshScales = async () => {
    if (!isAuthenticated || !api) {
      setScales([]);
      return;
    }

    try {
      const response = await scaleApi.available();
      const scalesList = response.data || [];
      setScales(scalesList);
    } catch (error) {
      console.error('Erro ao atualizar balanças:', error);
      setScales([]);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        // Obter computerId
        const id = await getComputerId();
        setComputerId(id);
      } catch (error) {
        console.error('Erro ao obter computerId:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Recarregar dispositivos quando o usuário fizer login
  useEffect(() => {
    if (isAuthenticated) {
      refreshPrinters();
      refreshScales();
    } else {
      setPrinters([]);
      setScales([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return (
    <DeviceContext.Provider
      value={{
        printers,
        scales,
        computerId,
        loading,
        refreshPrinters,
        refreshScales,
      }}
    >
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevices() {
  const context = useContext(DeviceContext);
  if (context === undefined) {
    throw new Error('useDevices must be used within a DeviceProvider');
  }
  return context;
}

