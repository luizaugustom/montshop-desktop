import { useDevices } from '../../contexts/DeviceContext';
import { Button } from '../ui/button';
import { Printer, Scale, Settings, RefreshCw, Search, CheckCircle2, XCircle, AlertCircle, TestTube } from 'lucide-react';
import { useEffect, useState } from 'react';
// PrinterDriverSetup removido - configuração de impressoras removida
// printerApi removido - configuração de impressoras removida
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { handleApiError } from '../../lib/handleApiError';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { loadPrintSettings, savePrintSettings, resolvePaperWidth, PaperSizeOption, PrintSettings } from '../../lib/print-settings';
import { printContent } from '../../lib/print-service';
import { checkPrinterStatus } from '../../lib/printer-check';

// Função para obter computerId
async function getComputerId(): Promise<string> {
  if (window.electronAPI) {
    return await window.electronAPI.devices.getComputerId();
  }
  // Fallback: usar ID do localStorage
  let id = localStorage.getItem('montshop_computer_id');
  if (!id) {
    id = `browser-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('montshop_computer_id', id);
  }
  return id;
}

export default function DevicesPage() {
  const { printers, scales, refreshPrinters, refreshScales, computerId } = useDevices();
  const { api } = useAuth();
  // Configuração de impressoras removida - estados removidos
  const [discovering, setDiscovering] = useState(false);
  const [printSettings, setPrintSettings] = useState<PrintSettings>(() => loadPrintSettings());
  const [testingPrint, setTestingPrint] = useState(false);

  useEffect(() => {
    refreshPrinters().catch((error) => {
      console.error('[DevicesPage] Erro ao atualizar impressoras ao carregar página:', error);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (printers.length === 0) {
      return;
    }

    setPrintSettings((current) => {
      const currentName = current?.printerName;
      const selected = currentName ? printers.find((printer) => printer.name === currentName) : undefined;

      if (selected) {
        if (selected.port && selected.port !== current.printerPort) {
          return savePrintSettings({
            printerPort: selected.port ?? null,
          });
        }
        return current;
      }

      const defaultPrinter = printers.find((printer) => printer.isDefault) ?? printers[0];
      if (!defaultPrinter) {
        return current;
      }

      return savePrintSettings({
        printerName: defaultPrinter.name,
        printerPort: defaultPrinter.port ?? null,
      });
    });
  }, [printers]);

  const handleDiscover = async () => {
    try {
      setDiscovering(true);
      toast.loading('Descobrindo impressoras no computador...', { id: 'discover-printers' });
      
      // Configuração de impressoras removida - não descobrir mais
      let discovered: any[] = [];
      toast.error('Configuração de impressoras foi removida do sistema', { id: 'discover-printers' });
      return;
      
      // Se há impressoras descobertas, tenta registrá-las no banco (sincronização)
      if (discovered.length > 0) {
        try {
          const id = computerId || await getComputerId();
          // Configuração de impressoras removida - não registrar mais
          // const registerResponse = await printerApi.registerDevices({
          //   computerId: id,
          //   printers: discovered,
          // });
          
          // Configuração removida - não processar mais
        } catch (registerError) {
          // Configuração removida - não processar mais
        }
      }
    } catch (error) {
      console.error('[DevicesPage] Erro ao descobrir impressoras:', error);
      handleApiError(error);
      toast.error('Erro ao descobrir impressoras', { id: 'discover-printers' });
    } finally {
      setDiscovering(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dispositivos</h1>
        <p className="text-muted-foreground">Gerencie impressoras e balanças</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="p-6 border border-border rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Impressoras ({printers.length})
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDiscover}
                disabled={discovering}
              >
                <Search className={`mr-2 h-4 w-4 ${discovering ? 'animate-spin' : ''}`} />
                {discovering ? 'Descobrindo...' : 'Descobrir'}
              </Button>
              <Button variant="outline" size="sm" onClick={refreshPrinters} disabled={discovering}>
                <RefreshCw className={`mr-2 h-4 w-4 ${discovering ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
          <div className="space-y-4">
            <PrinterConfiguration
              printers={printers}
              settings={printSettings}
              onChange={setPrintSettings}
              onTestPrint={async () => {
                try {
                  setTestingPrint(true);
                  const sampleContent = `
MONT SHOP
Teste de Impressão
-------------------------------
Data: ${new Date().toLocaleString('pt-BR')}
Impressora: ${printSettings.printerName ?? 'não definida'}
Porta: ${printSettings.printerPort ?? 'não definida'}
Largura: ${resolvePaperWidth(printSettings)} colunas
-------------------------------
Obrigado por utilizar o MontShop!
                  `.trim();

                  const result = await printContent(sampleContent, {
                    printerName: printSettings.printerName,
                    port: printSettings.printerPort,
                    paperSize: printSettings.paperSize,
                    customPaperWidth: printSettings.customPaperWidth ?? undefined,
                  });

                  if (result.success) {
                    toast.success('Teste enviado para a impressora configurada.');
                  } else {
                    toast.error(result.error ?? 'Não foi possível imprimir o teste.');
                  }
                } catch (error: any) {
                  console.error('[DevicesPage] Erro ao testar impressão:', error);
                  toast.error(error?.message ?? 'Erro ao testar impressão.');
                } finally {
                  setTestingPrint(false);
                }
              }}
              testing={testingPrint}
            />
            {printers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma impressora encontrada</p>
            ) : (
              printers.map((printer, index) => {
                const isConnected = printer.isConnected ?? (printer.status === 'online');
                const paperStatus = printer.paperStatus || 'UNKNOWN';
                const statusIcon = isConnected ? (
                  paperStatus === 'OK' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : paperStatus === 'ERROR' || paperStatus === 'EMPTY' ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )
                ) : (
                  <XCircle className="h-4 w-4 text-gray-400" />
                );
                
                const statusText = isConnected 
                  ? (paperStatus === 'OK' ? 'Conectada' : paperStatus === 'ERROR' ? 'Erro' : paperStatus === 'EMPTY' ? 'Sem papel' : paperStatus === 'LOW' ? 'Papel baixo' : 'Online')
                  : 'Desconectada';
                
                return (
                  <div key={index} className="p-3 bg-muted rounded">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {statusIcon}
                        <p className="font-medium">{printer.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={isConnected ? 'default' : 'secondary'}>
                        {statusText}
                      </Badge>
                      {printer.paperStatus && (
                        <Badge variant={
                          paperStatus === 'OK' ? 'default' : 
                          paperStatus === 'ERROR' || paperStatus === 'EMPTY' ? 'destructive' : 
                          'secondary'
                        }>
                          Papel: {paperStatus === 'OK' ? 'OK' : paperStatus === 'ERROR' ? 'Erro' : paperStatus === 'EMPTY' ? 'Vazio' : paperStatus === 'LOW' ? 'Baixo' : paperStatus}
                        </Badge>
                      )}
                      {printer.connection && (
                        <Badge variant="outline">
                          {printer.connection === 'usb' ? 'USB' : printer.connection === 'network' ? 'Rede' : printer.connection === 'bluetooth' ? 'Bluetooth' : printer.connection}
                        </Badge>
                      )}
                    </div>
                    {printer.lastStatusCheck && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Última verificação: {new Date(printer.lastStatusCheck).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="p-6 border border-border rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Balanças ({scales.length})
            </h2>
            <Button variant="outline" size="sm" onClick={refreshScales}>
              Atualizar
            </Button>
          </div>
          <div className="space-y-2">
            {scales.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma balança encontrada</p>
            ) : (
              scales.map((scale, index) => (
                <div key={index} className="p-3 bg-muted rounded">
                  <p className="font-medium">{scale.Name}</p>
                  <p className="text-sm text-muted-foreground">{scale.Description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* PrinterDriverSetup removido - configuração de impressoras removida */}
    </div>
  );
}

interface PrinterConfigurationProps {
  printers: {
    name: string;
    status: string;
    driver?: string;
    port?: string;
    isDefault?: boolean;
    isConnected?: boolean;
    connection?: string;
  }[];
  settings: PrintSettings;
  onChange: (settings: PrintSettings) => void;
  onTestPrint: () => Promise<void> | void;
  testing: boolean;
}

function PrinterConfiguration({
  printers,
  settings,
  onChange,
  onTestPrint,
  testing,
}: PrinterConfigurationProps) {
  const handlePrinterChange = (value: string) => {
    const selected = printers.find((printer) => printer.name === value);
    if (
      settings.printerName === value &&
      ((selected?.port ?? null) === (settings.printerPort ?? null))
    ) {
      return;
    }
    const updated = savePrintSettings({
      printerName: value || null,
      printerPort: selected?.port ?? null,
    });
    onChange(updated);
    toast.success(`Impressora "${value}" configurada como padrão local.`);
    void checkPrinterStatus();
  };

  const handlePortChange = (value: string) => {
    const updated = savePrintSettings({
      printerPort: value ? value.trim() : null,
    });
    onChange(updated);
  };

  const handlePaperSizeChange = (value: PaperSizeOption) => {
    const updated = savePrintSettings({
      paperSize: value,
    });
    onChange(updated);
  };

  const handleCustomWidthChange = (value: string) => {
    const numeric = Number(value);
    const sanitized = Number.isNaN(numeric) ? undefined : Math.max(16, Math.min(128, numeric));
    const updated = savePrintSettings({
      customPaperWidth: sanitized,
    });
    onChange(updated);
  };

  return (
    <div className="rounded-lg border border-border bg-background/40 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm uppercase tracking-wide">Preferências de Impressão</h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Impressora padrão</Label>
          <Select
            value={settings.printerName ?? ''}
            onValueChange={handlePrinterChange}
            disabled={printers.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a impressora" />
            </SelectTrigger>
            <SelectContent>
              {printers.map((printer) => (
                <SelectItem key={printer.name} value={printer.name}>
                  {printer.name}
                  {printer.port ? ` • Porta ${printer.port}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            As configurações são salvas no computador e usadas em todas as impressões deste ponto de venda.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Porta de comunicação</Label>
          <Input
            value={settings.printerPort ?? ''}
            onChange={(event) => handlePortChange(event.target.value)}
            placeholder="Ex: USB001, COM3, TCP://192.168.0.50"
          />
          <p className="text-xs text-muted-foreground">
            Informe a porta ou endereço configurado na impressora. Usado como fallback para impressão direta.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Tamanho do papel</Label>
          <Select
            value={settings.paperSize}
            onValueChange={(value) => handlePaperSizeChange(value as PaperSizeOption)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="80mm">80mm (48 colunas)</SelectItem>
              <SelectItem value="58mm">58mm (32 colunas)</SelectItem>
              <SelectItem value="a4">A4 (80 colunas)</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {settings.paperSize === 'custom' && (
          <div className="space-y-2">
            <Label>Largura personalizada (colunas)</Label>
            <Input
              type="number"
              min={16}
              max={128}
              value={settings.customPaperWidth ?? ''}
              onChange={(event) => handleCustomWidthChange(event.target.value)}
              placeholder="Ex: 42"
            />
            <p className="text-xs text-muted-foreground">
              Indique quantos caracteres cabem por linha. Valores recomendados entre 32 e 64 colunas.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">
          Largura aplicada: <span className="font-semibold">{resolvePaperWidth(settings)} colunas</span>.
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onTestPrint}
          disabled={!settings.printerName || testing}
          className="flex items-center gap-2 self-start sm:self-auto"
        >
          {testing ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
              Testando...
            </>
          ) : (
            <>
              <TestTube className="h-4 w-4" />
              Testar Impressão
            </>
          )}
        </Button>
      </div>
    </div>
  );
}


