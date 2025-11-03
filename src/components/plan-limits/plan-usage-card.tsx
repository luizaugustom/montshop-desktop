import { useEffect, useState } from 'react';
import { PlanUsageStats } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Package, Users, FileText, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PlanLimitsBadge } from './plan-limits-badge';

export function PlanUsageCard() {
  const { api } = useAuth();
  const [usage, setUsage] = useState<PlanUsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      const response = await api.get('/company/plan-usage');
      setUsage(response.data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas de uso:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usage) return null;

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatLimit = (current: number, max: number | null) => {
    if (max === null) return `${current} (Ilimitado)`;
    return `${current} / ${max}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Uso do Plano</CardTitle>
          <PlanLimitsBadge plan={usage.plan} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Produtos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Produtos</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {formatLimit(usage.usage.products.current, usage.usage.products.max)}
            </span>
          </div>
          <Progress
            value={usage.usage.products.percentage}
            className="h-2"
            style={{
              backgroundColor: 'hsl(var(--muted))',
            }}
          />
          {usage.usage.products.percentage >= 90 && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Limite quase atingido
            </p>
          )}
        </div>

        {/* Vendedores */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Vendedores</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {formatLimit(usage.usage.sellers.current, usage.usage.sellers.max)}
            </span>
          </div>
          <Progress
            value={usage.usage.sellers.percentage}
            className="h-2"
            style={{
              backgroundColor: 'hsl(var(--muted))',
            }}
          />
          {usage.usage.sellers.percentage >= 90 && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Limite quase atingido
            </p>
          )}
        </div>

        {/* Contas a Pagar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Contas a Pagar</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {formatLimit(usage.usage.billsToPay.current, usage.usage.billsToPay.max)}
            </span>
          </div>
          <Progress
            value={usage.usage.billsToPay.percentage}
            className="h-2"
            style={{
              backgroundColor: 'hsl(var(--muted))',
            }}
          />
          {usage.usage.billsToPay.percentage >= 90 && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Limite quase atingido
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

