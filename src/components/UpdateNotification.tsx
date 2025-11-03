import { useEffect, useState } from 'react';
import { X, RefreshCw } from 'lucide-react';
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

  useEffect(() => {
    if (!window.electronAPI) return;

    // Verificar atualizações ao iniciar
    window.electronAPI.updater.checkForUpdates();

    // Listeners de atualização
    window.electronAPI.updater.onUpdateAvailable((info: UpdateInfo) => {
      setUpdateAvailable(true);
      setUpdateInfo(info);
      toast.success(`Nova versão disponível: ${info.version}. Download automático iniciado...`, {
        duration: 5000,
      });
    });

    window.electronAPI.updater.onUpdateNotAvailable(() => {
      // Atualização não disponível - não mostrar nada
    });

    window.electronAPI.updater.onUpdateError((error: string) => {
      toast.error(`Erro ao verificar atualizações: ${error}`);
    });

    window.electronAPI.updater.onUpdateProgress((progressObj: any) => {
      setProgress(progressObj.percent);
      if (updateAvailable && progressObj.percent < 100) {
        setUpdateDownloaded(false);
      }
    });

    window.electronAPI.updater.onUpdateDownloaded((info: UpdateInfo) => {
      setUpdateDownloaded(true);
      setUpdateReadyToInstall(true);
      setUpdateInfo(info);
      toast.success('Atualização baixada! Será instalada automaticamente ao fechar o aplicativo.', {
        duration: 6000,
      });
    });

    // Listener para quando a atualização está pronta para instalar
    if (window.electronAPI.updater.onUpdateReadyToInstall) {
      window.electronAPI.updater.onUpdateReadyToInstall((data: any) => {
        setUpdateReadyToInstall(true);
        setUpdateDownloaded(true);
        if (data.version) {
          setUpdateInfo({ version: data.version });
        }
        toast.success(data.message || 'Atualização pronta para instalar!', {
          duration: 6000,
        });
      });
    }
  }, [updateAvailable]);

  const handleRestart = () => {
    if (window.electronAPI) {
      window.electronAPI.updater.restartAndInstall();
    }
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
    setUpdateDownloaded(false);
  };

  if (!updateAvailable && !updateDownloaded) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className="bg-card border border-border rounded-lg shadow-lg p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold mb-1">
              {updateReadyToInstall ? 'Atualização Pronta para Instalar' : updateDownloaded ? 'Atualização Baixada' : 'Atualização Disponível'}
            </h3>
            {updateInfo && (
              <p className="text-sm text-muted-foreground">
                Versão {updateInfo.version}
                {updateReadyToInstall && ' - Será instalada automaticamente ao fechar o aplicativo'}
              </p>
            )}
            {updateAvailable && !updateDownloaded && progress > 0 && (
              <div className="mt-2">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Baixando... {Math.round(progress)}%
                </p>
              </div>
            )}
            {updateReadyToInstall && (
              <p className="text-xs text-muted-foreground mt-2">
                A atualização será instalada automaticamente quando você fechar o aplicativo.
              </p>
            )}
          </div>
          {!updateReadyToInstall && (
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {updateReadyToInstall && (
          <div className="flex gap-2">
            <Button onClick={handleRestart} className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reiniciar Agora
            </Button>
            <Button variant="outline" onClick={handleDismiss} className="flex-1">
              Instalar ao Fechar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

