import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import { 
  Printer, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Search,
  Upload,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PrinterDriver {
  id: string;
  brand: string;
  model: string;
  type: string;
  driverName: string;
  supportedPorts: string[];
}

interface PrinterDriverSetupProps {
  open: boolean;
  onClose: () => void;
  printerName?: string;
  onDriverInstalled?: () => void;
}

export default function PrinterDriverSetup({
  open,
  onClose,
  printerName,
  onDriverInstalled,
}: PrinterDriverSetupProps) {
  const [brands, setBrands] = useState<Record<string, PrinterDriver[]>>({});
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [driverDetails, setDriverDetails] = useState<PrinterDriver | null>(null);
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{
    received: number;
    total: number;
    percentage: number;
    speed: number;
  } | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [detectedBrand, setDetectedBrand] = useState<string | null>(null);

  useEffect(() => {
    if (open && window.electronAPI) {
      loadDrivers();
      if (printerName) {
        detectBrand();
      }

      // Listener para progresso de download
      if (window.electronAPI.printerDrivers.onDownloadProgress) {
        window.electronAPI.printerDrivers.onDownloadProgress((data) => {
          if (data.driverId === selectedDriver) {
            setDownloadProgress(data.progress);
          }
        });
      }
    }
  }, [open, printerName, selectedDriver]);

  const loadDrivers = async () => {
    if (!window.electronAPI?.printerDrivers) return;
    try {
      const result = await window.electronAPI!.printerDrivers.list();
      setBrands(result.byBrand);
      
      // Selecionar primeira marca automaticamente
      const firstBrand = Object.keys(result.byBrand)[0];
      if (firstBrand) {
        setSelectedBrand(firstBrand);
      }
    } catch (error: any) {
      toast.error('Erro ao carregar drivers: ' + error.message);
    }
  };

  const detectBrand = async () => {
    if (!printerName || !window.electronAPI) return;
    
    try {
      const brand = await window.electronAPI.printerDrivers.detectBrand(printerName);
      if (brand) {
        setDetectedBrand(brand);
        setSelectedBrand(brand);
        toast.success(`Marca detectada: ${brand}`);
      }
    } catch (error) {
      console.error('Erro ao detectar marca:', error);
    }
  };

  const handleBrandChange = (brand: string) => {
    setSelectedBrand(brand);
    setSelectedDriver('');
    setDriverDetails(null);
    setIsInstalled(false);
  };

  const handleDriverSelect = async (driverId: string) => {
    if (!window.electronAPI?.printerDrivers) return;
    setSelectedDriver(driverId);
    
    try {
      const driver = await window.electronAPI!.printerDrivers.get(driverId);
      setDriverDetails(driver);
      
      // Verificar se está instalado
      await checkDriverStatus(driverId);
    } catch (error: any) {
      toast.error('Erro ao obter detalhes do driver: ' + error.message);
    }
  };

  const checkDriverStatus = async (driverId: string) => {
    if (!window.electronAPI) return;
    
    setChecking(true);
    try {
      const result = await window.electronAPI.printerDrivers.check(driverId);
      setIsInstalled(result.installed);
    } catch (error: any) {
      toast.error('Erro ao verificar driver: ' + error.message);
    } finally {
      setChecking(false);
    }
  };

  const handleDownloadAndInstall = async () => {
    if (!selectedDriver || !window.electronAPI) return;

    try {
      // Primeiro, fazer download
      setDownloading(true);
      setDownloadProgress({
        received: 0,
        total: 0,
        percentage: 0,
        speed: 0,
      });

      const downloadResult = await window.electronAPI.printerDrivers.download(selectedDriver);

      if (!downloadResult.success) {
        throw new Error(downloadResult.error || 'Falha no download');
      }

      if (downloadResult.fromCache) {
        toast.success('Driver encontrado no cache');
      } else {
        toast.success('Download concluído!');
      }

      setDownloading(false);
      setDownloadProgress(null);

      // Depois, instalar
      setInstalling(true);
      const installResult = await window.electronAPI.printerDrivers.install(
        selectedDriver,
        downloadResult.filePath
      );

      if (installResult.success) {
        toast.success(installResult.message);
        setIsInstalled(true);
        onDriverInstalled?.();
      } else {
        toast.error(installResult.message);
      }
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
      setDownloading(false);
      setDownloadProgress(null);
    } finally {
      setInstalling(false);
    }
  };

  const handleInstall = async () => {
    if (!selectedDriver || !window.electronAPI) return;

    setInstalling(true);
    try {
      const result = await window.electronAPI.printerDrivers.install(selectedDriver);

      if (result.success) {
        toast.success(result.message);
        setIsInstalled(true);
        onDriverInstalled?.();
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error('Erro ao instalar driver: ' + error.message);
    } finally {
      setInstalling(false);
    }
  };

  const handleInstallFromFile = async () => {
    if (!window.electronAPI) return;
    
    setInstalling(true);
    try {
      const result = await window.electronAPI.printerDrivers.installFromFile();
      
      if (result.canceled) {
        return;
      }
      
      if (result.success) {
        toast.success(result.message || 'Driver instalado com sucesso!');
        onDriverInstalled?.();
      }
    } catch (error: any) {
      toast.error('Erro ao instalar driver: ' + error.message);
    } finally {
      setInstalling(false);
    }
  };

  const availableDrivers = selectedBrand ? brands[selectedBrand] || [] : [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Configurar Driver de Impressora
          </DialogTitle>
          <DialogDescription>
            Selecione o modelo da sua impressora para instalar o driver correto
            {printerName && (
              <span className="block mt-1 text-sm font-medium">
                Impressora: {printerName}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Detecção automática */}
          {detectedBrand && (
            <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-primary" />
              <span className="text-sm">
                Marca detectada automaticamente: <strong>{detectedBrand}</strong>
              </span>
            </div>
          )}

          {/* Seleção de Marca */}
          <div className="space-y-2">
            <Label>Marca da Impressora</Label>
            <Select value={selectedBrand} onValueChange={handleBrandChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a marca" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(brands).map((brand) => (
                  <SelectItem key={brand} value={brand}>
                    {brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seleção de Modelo */}
          {selectedBrand && (
            <div className="space-y-2">
              <Label>Modelo da Impressora</Label>
              <Select value={selectedDriver} onValueChange={handleDriverSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o modelo" />
                </SelectTrigger>
                <SelectContent>
                  {availableDrivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{driver.model}</span>
                        <Badge variant="outline" className="ml-2">
                          {driver.type}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

              {/* Barra de Progresso de Download */}
          {downloading && downloadProgress && (
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Baixando driver...</span>
                <span className="font-medium">
                  {Math.round(downloadProgress.percentage)}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${downloadProgress.percentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {formatBytes(downloadProgress.received)} /{' '}
                  {downloadProgress.total > 0
                    ? formatBytes(downloadProgress.total)
                    : 'calculando...'}
                </span>
                {downloadProgress.speed > 0 && (
                  <span>{formatBytes(downloadProgress.speed)}/s</span>
                )}
              </div>
            </div>
          )}

          {/* Detalhes do Driver */}
          {driverDetails && (
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{driverDetails.driverName}</h4>
                  <p className="text-sm text-muted-foreground">
                    {driverDetails.brand} {driverDetails.model}
                  </p>
                </div>
                {checking ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isInstalled ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-medium">Instalado</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">Não Instalado</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">Portas suportadas:</span>
                {driverDetails.supportedPorts.map((port) => (
                  <Badge key={port} variant="secondary">
                    {port.toUpperCase()}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleDownloadAndInstall}
              disabled={!selectedDriver || isInstalled || installing || downloading}
              className="flex-1"
            >
              {downloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Baixando...
                </>
              ) : installing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Instalando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Baixar e Instalar
                </>
              )}
            </Button>
            <Button
              onClick={handleInstallFromFile}
              variant="outline"
              disabled={installing}
            >
              <Upload className="mr-2 h-4 w-4" />
              Instalar de Arquivo
            </Button>
            <Button onClick={onClose} variant="ghost">
              Cancelar
            </Button>
          </div>

          {/* Nota sobre driver genérico */}
          <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
            <strong>Nota:</strong> Se sua impressora não estiver na lista ou usar protocolo ESC/POS padrão, 
            você pode selecionar "Genérico - ESC/POS (USB)" que funciona com a maioria das impressoras térmicas.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Função auxiliar para formatar bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

