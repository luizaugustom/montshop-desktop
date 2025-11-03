import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Download, Filter, TrendingUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { handleApiError } from '../../lib/handleApiError';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { SalesTable } from '../sales-history/sales-table';
import { SaleDetailsDialog } from '../sales-history/sale-details-dialog';

type PeriodFilter = 'today' | 'week' | 'month' | '3months' | '6months' | 'year' | 'all';

interface PeriodOption {
  value: PeriodFilter;
  label: string;
  days?: number;
}

const periodOptions: PeriodOption[] = [
  { value: 'today', label: 'Hoje', days: 0 },
  { value: 'week', label: 'Última Semana', days: 7 },
  { value: 'month', label: 'Último Mês', days: 30 },
  { value: '3months', label: 'Últimos 3 Meses', days: 90 },
  { value: '6months', label: 'Últimos 6 Meses', days: 180 },
  { value: 'year', label: 'Último Ano', days: 365 },
  { value: 'all', label: 'Todas', days: undefined },
];

export default function SalesHistoryPage() {
  const { api, user } = useAuth();
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Verificar se é vendedor
  const isSeller = user?.role === 'vendedor';

  // Calcular datas com base no período selecionado
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    
    const selectedPeriod = periodOptions.find(p => p.value === period);
    
    if (!selectedPeriod || selectedPeriod.days === undefined) {
      return { startDate: undefined, endDate: undefined };
    }

    const start = new Date();
    if (selectedPeriod.days === 0) {
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(start.getDate() - selectedPeriod.days);
      start.setHours(0, 0, 0, 0);
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }, [period]);

  // Buscar vendas - usar endpoint correto baseado no role
  const { data: salesData, isLoading, refetch } = useQuery({
    queryKey: ['sales-history', isSeller, period, page, limit, startDate, endDate],
    queryFn: async () => {
      const params: any = { page, limit };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      // Se for vendedor, usar endpoint my-sales, senão usar endpoint geral
      const endpoint = isSeller ? '/sale/my-sales' : '/sale';
      const response = await api.get(endpoint, { params });
      return response.data;
    },
    enabled: !!user,
  });

  // Buscar estatísticas - usar endpoint correto baseado no role
  const { data: statsData } = useQuery({
    queryKey: ['sales-stats', isSeller, period, startDate, endDate],
    queryFn: async () => {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      // Se for vendedor, usar endpoint my-stats, senão usar endpoint stats
      const endpoint = isSeller ? '/sale/my-stats' : '/sale/stats';
      const response = await api.get(endpoint, { params });
      return response.data;
    },
    enabled: !!user,
  });

  const sales = salesData?.sales || salesData?.data || [];
  const total = salesData?.total || 0;
  const totalPages = salesData?.totalPages || Math.ceil(total / limit);

  // Backend retorna totalValue, mas o código espera totalRevenue
  const stats = {
    totalSales: statsData?.totalSales || 0,
    totalRevenue: statsData?.totalRevenue || statsData?.totalValue || 0,
    averageTicket: statsData?.averageTicket || 0,
  };

  const handleViewDetails = (saleId: string) => {
    setSelectedSaleId(saleId);
    setDetailsOpen(true);
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Dinheiro',
      credit_card: 'Cartão de Crédito',
      debit_card: 'Cartão de Débito',
      pix: 'PIX',
      installment: 'Parcelado',
    };
    return labels[method] || method;
  };

  const handleExportSales = async () => {
    try {
      toast.loading('Gerando arquivo Excel...', { id: 'export' });

      const params: any = { limit: 10000 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      // Se for vendedor, usar endpoint my-sales, senão usar endpoint geral
      const endpoint = isSeller ? '/sale/my-sales' : '/sale';
      const response = await api.get(endpoint, { params });
      const allSales = response.data.sales || response.data.data || [];

      const workbook = XLSX.utils.book_new();

      const summaryData = [
        ['RELATÓRIO DE VENDAS'],
        [''],
        ['Período:', periodOptions.find(p => p.value === period)?.label || 'Todas'],
        ['Data de Geração:', formatDateTime(new Date().toISOString())],
        startDate ? ['Data Início:', formatDateTime(startDate)] : [],
        endDate ? ['Data Fim:', formatDateTime(endDate)] : [],
        [''],
        ['ESTATÍSTICAS'],
        ['Total de Vendas:', stats.totalSales],
        ['Receita Total:', formatCurrency(stats.totalRevenue)],
        ['Ticket Médio:', formatCurrency(stats.averageTicket)],
      ].filter(row => row.length > 0);

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      summarySheet['!cols'] = [{ wch: 20 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');

      const salesData: any[] = [];
      salesData.push([
        'ID da Venda',
        'Data',
        'Cliente',
        'CPF/CNPJ',
        'Vendedor',
        'Qtd. Itens',
        'Total',
        'Troco',
        'Formas de Pagamento',
      ]);

      allSales.forEach((sale: any) => {
        const paymentMethods = sale.paymentMethods
          ?.map((pm: any) => `${getPaymentMethodLabel(pm.method)}: ${formatCurrency(pm.amount)}`)
          .join('; ') || '-';

        salesData.push([
          sale.id,
          formatDateTime(sale.saleDate || sale.createdAt),
          sale.clientName || 'Cliente Anônimo',
          sale.clientCpfCnpj || '-',
          sale.seller?.name || '-',
          sale.items?.length || 0,
          Number(sale.total),
          Number(sale.change || 0),
          paymentMethods,
        ]);
      });

      const salesSheet = XLSX.utils.aoa_to_sheet(salesData);
      salesSheet['!cols'] = [
        { wch: 38 },
        { wch: 18 },
        { wch: 25 },
        { wch: 18 },
        { wch: 20 },
        { wch: 12 },
        { wch: 15 },
        { wch: 12 },
        { wch: 40 },
      ];
      XLSX.utils.book_append_sheet(workbook, salesSheet, 'Vendas');

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vendas-${period}-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Vendas exportadas com sucesso!', { id: 'export' });
    } catch (error) {
      toast.error('Erro ao exportar vendas', { id: 'export' });
      handleApiError(error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Histórico de Vendas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualize e gerencie todas as vendas realizadas
          </p>
        </div>
        <Button onClick={handleExportSales} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Período:</span>
          </div>
          <Select value={period} onValueChange={(value) => {
            setPeriod(value as PeriodFilter);
            setPage(1);
          }}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Estatísticas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total de Vendas</p>
              <p className="text-2xl font-bold mt-2">{stats.totalSales}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Receita Total</p>
              <p className="text-2xl font-bold mt-2">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ticket Médio</p>
              <p className="text-2xl font-bold mt-2">{formatCurrency(stats.averageTicket)}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabela de Vendas */}
      <Card>
        <SalesTable
          sales={sales}
          isLoading={isLoading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onViewDetails={handleViewDetails}
        />
      </Card>

      {/* Dialog de Detalhes */}
      {selectedSaleId && (
        <SaleDetailsDialog
          open={detailsOpen}
          onClose={() => {
            setDetailsOpen(false);
            setSelectedSaleId(null);
          }}
          saleId={selectedSaleId}
        />
      )}
    </div>
  );
}
