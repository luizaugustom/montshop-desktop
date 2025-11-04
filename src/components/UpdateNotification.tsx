import React, { useEffect, useState, useRef } from 'react';
import { X, RefreshCw, Download, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import toast from 'react-hot-toast';

interface UpdateInfo {
  version: string;
}

export default function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [updateReadyToInstall, setUpdateReadyToInstall] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState(0);
  
  // Flags para prevenir notificações duplicadas - usando ref para persistir entre renders
  const notifiedRef = useRef({ available: false, downloaded: false, ready: false });
  const listenersRegisteredRef = useRef(false);

  useEffect(() => {
    if (!window.electronAPI) return;

    // Prevenir múltiplos registros de listeners
    if (listenersRegisteredRef.current) {
      return;
    }

    listenersRegisteredRef.current = true;

    // Listeners de atualização
    const handleUpdateAvailable = (info: UpdateInfo) => {
      // Prevenir notificações duplicadas
      if (!notifiedRef.current.available) {
        notifiedRef.current.available = true;
        setUpdateAvailable(true);
        setUpdateInfo(info);
        toast.success(`Nova versão disponível: ${info.version}. Download automático iniciado...`, {
          duration: 5000,
          id: 'update-available', // ID único para evitar duplicatas
        });
      }
    };

    const handleUpdateNotAvailable = () => {
      // Atualização não disponível - resetar flags
      notifiedRef.current.available = false;
      notifiedRef.current.downloaded = false;
      notifiedRef.current.ready = false;
      setUpdateAvailable(false);
      setUpdateDownloaded(false);
      setUpdateReadyToInstall(false);
    };

    const handleUpdateError = (error: string) => {
      // Apenas mostrar erro se não for um erro comum de rede
      if (!error.includes('net::ERR_INTERNET_DISCONNECTED') && 
          !error.includes('net::ERR_CONNECTION_REFUSED')) {
        toast.error(`Erro ao verificar atualizações: ${error}`, {
          id: 'update-error', // ID único para evitar duplicatas
          duration: 5000,
        });
      }
    };

    const handleUpdateProgress = (progressObj: any) => {
      setProgress(progressObj.percent || 0);
      // Atualizar estado baseado no progresso
      if (progressObj.percent < 100) {
        setUpdateDownloaded(false);
        setUpdateReadyToInstall(false);
      }
    };

    const handleUpdateDownloaded = (info: UpdateInfo) => {
      // Prevenir notificações duplicadas
      if (!notifiedRef.current.downloaded) {
        notifiedRef.current.downloaded = true;
        notifiedRef.current.ready = true;
        setUpdateDownloaded(true);
        setUpdateReadyToInstall(true);
        setUpdateInfo(info);
        setProgress(100);
        toast.success(`Atualização ${info.version} baixada! Será instalada ao fechar o aplicativo.`, {
          duration: 6000,
          id: 'update-downloaded', // ID único para evitar duplicatas
        });
      }
    };

    const handleUpdateReadyToInstall = (data: any) => {
      // Evitar duplicatas se já foi processado
      if (!notifiedRef.current.ready) {
        notifiedRef.current.ready = true;
        notifiedRef.current.downloaded = true;
        setUpdateReadyToInstall(true);
        setUpdateDownloaded(true);
        if (data.version) {
          setUpdateInfo({ version: data.version });
        }
        setProgress(100);
        // Não mostrar toast aqui se já foi mostrado no handleUpdateDownloaded
        if (!notifiedRef.current.downloaded) {
          toast.success(data.message || 'Atualização pronta para instalar!', {
            duration: 6000,
            id: 'update-ready', // ID único para evitar duplicatas
          });
        }
      }
    };

    // Registrar listeners e armazenar funções de cleanup
    const cleanupFunctions: Array<(() => void) | void> = [];
    
    const cleanup1 = window.electronAPI.updater.onUpdateAvailable(handleUpdateAvailable);
    if (cleanup1) cleanupFunctions.push(cleanup1);
    
    const cleanup2 = window.electronAPI.updater.onUpdateNotAvailable(handleUpdateNotAvailable);
    if (cleanup2) cleanupFunctions.push(cleanup2);
    
    const cleanup3 = window.electronAPI.updater.onUpdateError(handleUpdateError);
    if (cleanup3) cleanupFunctions.push(cleanup3);
    
    const cleanup4 = window.electronAPI.updater.onUpdateProgress(handleUpdateProgress);
    if (cleanup4) cleanupFunctions.push(cleanup4);
    
    const cleanup5 = window.electronAPI.updater.onUpdateDownloaded(handleUpdateDownloaded);
    if (cleanup5) cleanupFunctions.push(cleanup5);
    
    if (window.electronAPI.updater.onUpdateReadyToInstall) {
      const cleanup6 = window.electronAPI.updater.onUpdateReadyToInstall(handleUpdateReadyToInstall);
      if (cleanup6) cleanupFunctions.push(cleanup6);
    }

    // Cleanup: remover listeners quando componente desmontar
    return () => {
      listenersRegisteredRef.current = false;
      // Chamar todas as funções de cleanup
      cleanupFunctions.forEach(cleanup => {
        if (typeof cleanup === 'function') {
          try {
            cleanup();
          } catch (error) {
            // Ignorar erros de cleanup
          }
        }
      });
    };
  }, []); // Array vazio - executar apenas uma vez

  const handleRestart = () => {
    if (window.electronAPI) {
      window.electronAPI.updater.restartAndInstall();
    }
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
    setUpdateDownloaded(false);
    setUpdateReadyToInstall(false);
  };

  if (!updateAvailable && !updateDownloaded && !updateReadyToInstall) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-card border-2 border-primary/20 rounded-xl shadow-2xl p-5 space-y-4 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              {updateReadyToInstall ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              ) : updateDownloaded ? (
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
              ) : (
                <Download className="h-5 w-5 text-primary flex-shrink-0 animate-pulse" />
              )}
              <h3 className="font-semibold text-base">
                {updateReadyToInstall 
                  ? 'Atualização Pronta para Instalar' 
                  : updateDownloaded 
                    ? 'Atualização Baixada' 
                    : 'Nova Versão Disponível'}
              </h3>
            </div>
            
            {updateInfo && (
              <p className="text-sm text-muted-foreground ml-7">
                Versão {updateInfo.version}
                {updateReadyToInstall && (
                  <span className="block mt-1 text-xs text-muted-foreground/80">
                    Será instalada automaticamente ao fechar o aplicativo
                  </span>
                )}
              </p>
            )}
            
            {updateAvailable && !updateDownloaded && progress > 0 && (
              <div className="mt-3 ml-7 space-y-1">
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Baixando atualização... {Math.round(progress)}%
                </p>
              </div>
            )}
            
            {updateReadyToInstall && (
              <div className="mt-2 ml-7">
                <p className="text-xs text-muted-foreground">
                  A atualização será instalada automaticamente quando você fechar o aplicativo.
                </p>
              </div>
            )}
          </div>
          
          {!updateReadyToInstall && (
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-accent"
              aria-label="Fechar notificação"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {updateReadyToInstall && (
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button 
              onClick={handleRestart} 
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reiniciar Agora
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDismiss} 
              className="flex-1"
            >
              Instalar ao Fechar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

