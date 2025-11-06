import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Printer } from 'lucide-react';
import type { PrintSettings } from '../../lib/print-settings';

interface PrintConfirmationDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  settings?: PrintSettings | null;
}

export function PrintConfirmationDialog({
  open,
  onConfirm,
  onCancel,
  loading = false,
  settings,
}: PrintConfirmationDialogProps) {
  const printerName = settings?.printerName ?? null;
  const printerPort = settings?.printerPort ?? null;
  const paperSize = settings?.paperSize ?? '80mm';

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Printer className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">
              Imprimir Cupom?
            </DialogTitle>
          </div>
          <DialogDescription className="text-base mt-2">
            Deseja imprimir o cupom desta venda agora?
            <br />
            <br />
            O cupom será enviado para a impressora configurada neste computador.
          </DialogDescription>
          <div className="mt-4 rounded-md border border-border bg-muted/40 p-3 text-sm leading-relaxed space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Impressora:</span>
              <span className="font-medium">{printerName ?? 'Não configurada'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Porta:</span>
              <span className="font-medium">{printerPort ?? 'Automática'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tamanho:</span>
              <span className="font-medium">
                {paperSize === '80mm' && '80mm (48 colunas)'}
                {paperSize === '58mm' && '58mm (32 colunas)'}
                {paperSize === 'a4' && 'A4'}
                {paperSize === 'custom' && `${settings?.customPaperWidth ?? 48} colunas`}
              </span>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Não Imprimir
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Imprimindo...
              </>
            ) : (
              <>
                <Printer className="mr-2 h-4 w-4" />
                Sim, Imprimir
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

