import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { DatePicker } from './ui/date-picker';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Mail, Send } from 'lucide-react';
import { customerApi } from '../lib/api-endpoints';

interface PromotionalEmailDialogProps {
  children: React.ReactNode;
}

export function PromotionalEmailDialog({ children }: PromotionalEmailDialogProps) {
  const { api } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    description: '',
    discount: '',
    validUntil: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.message || !formData.description || !formData.discount || !formData.validUntil) {
      toast.error('Todos os campos são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      await customerApi.sendBulkPromotionalEmail(formData);
      toast.success('Email promocional enviado com sucesso para todos os clientes!');
      setOpen(false);
      setFormData({
        title: '',
        message: '',
        description: '',
        discount: '',
        validUntil: '',
      });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao enviar email promocional');
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
            <Mail className="h-5 w-5" />
            Enviar Email Promocional
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Promoção Especial!"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem *</Label>
            <Input
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Ex: Aproveite agora!"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição detalhada da promoção..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="discount">Desconto *</Label>
            <Input
              id="discount"
              value={formData.discount}
              onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
              placeholder="Ex: 20% ou R$ 50,00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="validUntil">Válido até *</Label>
            <DatePicker
              date={formData.validUntil ? new Date(formData.validUntil) : undefined}
              onSelect={(date) => setFormData({ ...formData, validUntil: date?.toISOString().split('T')[0] || '' })}
              placeholder="Selecione a data de validade"
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
                  Enviar Email
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

