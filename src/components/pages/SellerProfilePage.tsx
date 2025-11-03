import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  CreditCard, 
  RefreshCw,
  TrendingUp,
  DollarSign,
  ShoppingCart
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { DatePicker } from '../ui/date-picker';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, formatCurrency } from '../../lib/utils';
import { SellerCharts } from '../sellers/seller-charts';
import { sellerApi } from '../../lib/api-endpoints';
import type { Seller, SellerStats, Sale } from '../../types';

interface UpdateSellerProfileDto {
  name?: string;
  cpf?: string;
  birthDate?: string;
  email?: string;
  phone?: string;
}

export default function SellerProfilePage() {
  const { api, user } = useAuth();

  const {
    register,
    formState: { errors },
    reset,
    control,
  } = useForm<UpdateSellerProfileDto>({
    defaultValues: {
      name: '',
      cpf: '',
      birthDate: '',
      email: '',
      phone: '',
    },
  });

  const { data: profileData, isLoading: isLoadingProfile, refetch: refetchProfile } = useQuery({
    queryKey: ['seller-profile'],
    queryFn: async () => {
      try {
        const response = await sellerApi.myProfile.get();
        return response.data || response;
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        throw error;
      }
    },
    enabled: user?.role === 'vendedor',
  });

  const { data: statsData, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['seller-stats'],
    queryFn: async () => {
      try {
        const response = await sellerApi.myStats();
        return response.data || response;
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        throw error;
      }
    },
    enabled: user?.role === 'vendedor',
  });

  const { data: salesData, isLoading: isLoadingSales, refetch: refetchSales } = useQuery({
    queryKey: ['seller-sales'],
    queryFn: async () => {
      try {
        const response = await sellerApi.mySales({ page: 1, limit: 10 });
        return response.data || response;
      } catch (error) {
        console.error('Erro ao carregar vendas:', error);
        throw error;
      }
    },
    enabled: user?.role === 'vendedor',
  });

  const profile: Seller = profileData;
  const stats: SellerStats = statsData;
  const recentSales: Sale[] = Array.isArray(salesData) ? salesData : salesData?.data || [];

  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name,
        cpf: profile.cpf || '',
        birthDate: profile.birthDate || '',
        email: profile.email || '',
        phone: profile.phone || '',
      });
    }
  }, [profile, reset]);


  const handleRefresh = () => {
    refetchProfile();
    refetchStats();
    refetchSales();
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
  };

  if (user?.role !== 'vendedor') {
    return (
      <div className="text-center py-8">
        <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-300 mb-2">Acesso negado</h2>
        <p className="text-muted-foreground">Esta página é exclusiva para vendedores.</p>
      </div>
    );
  }

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-500">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Carregando perfil...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-300 mb-2">Perfil não encontrado</h2>
        <p className="text-muted-foreground">Não foi possível carregar as informações do seu perfil.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
          <p className="text-muted-foreground">Visualize suas informações pessoais</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoadingProfile || isLoadingStats || isLoadingSales}
          >
            <RefreshCw className={`h-4 w-4 ${(isLoadingProfile || isLoadingStats || isLoadingSales) ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {isLoadingStats ? '...' : stats?.totalSales || 0}
              </p>
              <p className="text-sm text-muted-foreground">Total de Vendas</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {isLoadingStats ? '...' : formatCurrency(stats?.totalRevenue || 0)}
              </p>
              <p className="text-sm text-muted-foreground">Faturamento Total</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {isLoadingStats ? '...' : formatCurrency(stats?.averageSaleValue || 0)}
              </p>
              <p className="text-sm text-muted-foreground">Ticket Médio</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="h-5 w-5" />
          Informações Pessoais
        </h3>

        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="login" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Login (Email)
              </Label>
              <Input
                id="login"
                value={profile.login}
                disabled
                className="bg-gray-50 dark:bg-gray-900"
              />
              <p className="text-xs text-muted-foreground mt-1">Login não pode ser alterado</p>
            </div>

            <div>
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Nome Completo *
              </Label>
              <Input
                id="name"
                placeholder="João Silva"
                {...register('name')}
                disabled={true}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="cpf" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                CPF
              </Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                {...register('cpf')}
                disabled={true}
                className={errors.cpf ? 'border-red-500' : ''}
              />
              {errors.cpf && (
                <p className="text-sm text-red-500 mt-1">{errors.cpf.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="birthDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data de Nascimento
              </Label>
              <Controller
                name="birthDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    date={field.value ? new Date(field.value) : undefined}
                    onSelect={(date) => field.onChange(date?.toISOString().split('T')[0] || '')}
                    placeholder="Selecione sua data de nascimento"
                    disabled={true}
                  />
                )}
              />
              {errors.birthDate && (
                <p className="text-sm text-red-500 mt-1">{errors.birthDate.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="joao@example.com"
                {...register('email')}
                disabled={true}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefone
              </Label>
              <Input
                id="phone"
                placeholder="(11) 99999-9999"
                {...register('phone')}
                disabled={true}
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && (
                <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
              )}
            </div>
          </div>

        </form>
      </Card>

      <SellerCharts stats={stats} isLoading={isLoadingStats} />

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Vendas Recentes
        </h3>
        {isLoadingSales ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-gray-500">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Carregando vendas...
            </div>
          </div>
        ) : recentSales.length > 0 ? (
          <div className="space-y-3">
            {recentSales.map((sale: any) => (
              <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div>
                  <p className="font-medium">Venda #{sale.saleNumber || sale.id?.substring(0, 8)}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(sale.createdAt || sale.saleDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">
                    {formatCurrency(sale.total)}
                  </p>
                  {sale.paymentMethods && (
                    <div className="flex gap-1">
                      {(Array.isArray(sale.paymentMethods) ? sale.paymentMethods : []).map((method: any, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {typeof method === 'string' 
                            ? (method === 'cash' ? 'Dinheiro' :
                               method === 'credit_card' ? 'Cartão' :
                               method === 'debit_card' ? 'Débito' :
                               method === 'pix' ? 'PIX' : 'Parcelado')
                            : (method.method === 'cash' ? 'Dinheiro' :
                               method.method === 'credit_card' ? 'Cartão' :
                               method.method === 'debit_card' ? 'Débito' :
                               method.method === 'pix' ? 'PIX' : 'Parcelado')
                          }
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma venda encontrada</p>
          </div>
        )}
      </Card>
    </div>
  );
}

