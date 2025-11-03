# 📋 Guia para Expandir Todas as Páginas

## ✅ O que já está feito

1. ✅ **Estrutura base completa** - Sidebar, Header, Roteamento
2. ✅ **Dashboard completo** - Com gráficos e métricas
3. ✅ **Componentes UI** - Todos os componentes Radix UI
4. ✅ **Store de carrinho** - Carrinho funcional
5. ✅ **Componentes de Sales** - ProductList, Cart, BarcodeScanner

## 📝 Próximos passos - Ordem de implementação

### 1. Criar tipos TypeScript completos
**Arquivo:** `src/types/index.ts`
- Copiar de `front-lojas/src/types/index.ts`
- Todos os tipos necessários

### 2. Criar validações
**Arquivo:** `src/lib/validations.ts`
- Copiar de `front-lojas/src/lib/validations.ts`
- Schemas Zod para validação

### 3. Expandir SalesPage completa
**Já iniciado** - Precisa dos componentes:
- ✅ ProductList
- ✅ Cart  
- ✅ BarcodeScanner
- ⏳ CheckoutDialog
- ⏳ BudgetDialog
- ⏳ InstallmentSaleModal (opcional)
- ⏳ PrintConfirmationDialog (opcional)

### 4. Expandir ProductsPage
**Copiar de:** `front-lojas/src/app/(dashboard)/products/page.tsx`
**Componentes necessários:**
- ProductsTable
- ProductDialog
- ProductFilters

### 5. Expandir CustomersPage
**Copiar de:** `front-lojas/src/app/(dashboard)/customers/page.tsx`
**Componentes necessários:**
- CustomersTable
- CustomerDialog

### 6. Expandir todas outras páginas
- SellersPage
- SalesHistoryPage
- ReportsPage
- BillsPage
- InstallmentsPage
- CashClosurePage
- InvoicesPage
- InboundInvoicesPage
- CompaniesPage
- SettingsPage
- BudgetsPage

## 🔧 Adaptações necessárias ao copiar

### 1. Imports
```tsx
// Remover:
'use client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

// Adicionar:
import { useAuth } from '../../contexts/AuthContext' // ao invés de hooks/useAuth
```

### 2. Navegação
```tsx
// Remover:
router.push('/products')

// Adicionar:
onNavigate('products') // passar como prop do MainLayout
```

### 3. Autorizações
```tsx
// Garantir que roles estão corretos:
const canManage = user?.role === 'empresa' || user?.role === 'admin'
const isCompany = user?.role === 'empresa'
const isAdmin = user?.role === 'admin'
```

## 📂 Estrutura de componentes

```
src/
├── components/
│   ├── sales/ ✅ (parcial)
│   │   ├── product-list.tsx ✅
│   │   ├── cart.tsx ✅
│   │   ├── barcode-scanner.tsx ✅
│   │   ├── checkout-dialog.tsx ⏳
│   │   ├── budget-dialog.tsx ⏳
│   │   └── ...
│   ├── products/ ⏳
│   ├── customers/ ⏳
│   └── ...
```

## 🎯 Prioridade

1. **ALTA** - SalesPage (PDV principal)
2. **ALTA** - ProductsPage (CRUD produtos)
3. **ALTA** - CustomersPage (CRUD clientes)
4. **MÉDIA** - Outras páginas administrativas
5. **BAIXA** - Relatórios e configurações avançadas

## ✅ Checklist

- [ ] Tipos TypeScript completos
- [ ] Validações Zod
- [ ] CheckoutDialog completo
- [ ] BudgetDialog completo
- [ ] SalesPage 100% funcional
- [ ] ProductsPage completa
- [ ] CustomersPage completa
- [ ] Todas outras páginas expandidas
- [ ] Autorizações verificadas
- [ ] Estilizações iguais ao frontend

