import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Megaphone, Send } from 'lucide-react';
import { adminApi } from '../lib/api-endpoints';

interface AdminBroadcastDialogProps {
  children: React.ReactNode;
}

export function AdminBroadcastDialog({ children }: AdminBroadcastDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { api } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target: 'all' as 'all' | 'companies' | 'sellers',
    actionUrl: '',
    actionLabel: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await adminApi.broadcastNotification(formData);

      toast.success(`Notificação enviada para ${response.data?.count || 0} usuário(s)!`, {
        duration: 5000,
      });

      setFormData({
        title: '',
        message: '',
        target: 'all',
        actionUrl: '',
        actionLabel: '',
      });

      setOpen(false);
    } catch (error: any) {
      console.error('Erro ao enviar notificação:', error);
      toast.error(error?.response?.data?.message || 'Erro ao enviar notificação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Enviar Notificação em Massa
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Nova atualização disponível"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Descreva a notificação..."
              rows={5}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target">Destinatários *</Label>
            <select
              id="target"
              value={formData.target}
              onChange={(e) => setFormData({ ...formData, target: e.target.value as any })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            >
              <option value="all">Todos os usuários</option>
              <option value="companies">Apenas empresas</option>
              <option value="sellers">Apenas vendedores</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="actionUrl">URL de Ação (Opcional)</Label>
            <Input
              id="actionUrl"
              value={formData.actionUrl}
              onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
              placeholder="Ex: /settings"
              type="text"
            />
            <p className="text-xs text-muted-foreground">
              URL para onde o usuário será redirecionado ao clicar na notificação
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="actionLabel">Rótulo do Botão (Opcional)</Label>
            <Input
              id="actionLabel"
              value={formData.actionLabel}
              onChange={(e) => setFormData({ ...formData, actionLabel: e.target.value })}
              placeholder="Ex: Ver atualizações"
              type="text"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Send className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Notificação
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

