# 📋 Guia Completo - Expandir Todas as Páginas

## ✅ Status Atual

### Páginas Completas
- ✅ **DashboardPage** - Completo com gráficos e métricas
- ✅ **SalesPage** - Completo com PDV funcional
- ✅ **DevicesPage** - Completo

### Páginas Básicas (Precisam Expansão)
- ⏳ ProductsPage
- ⏳ CustomersPage  
- ⏳ SellersPage
- ⏳ SalesHistoryPage
- ⏳ ReportsPage
- ⏳ BillsPage
- ⏳ InstallmentsPage
- ⏳ CashClosurePage
- ⏳ InvoicesPage
- ⏳ InboundInvoicesPage
- ⏳ CompaniesPage
- ⏳ SettingsPage
- ⏳ BudgetsPage

## 🎯 Próximos Passos

### 1. Criar Tipos TypeScript
**Arquivo:** `src/types/index.ts`
```bash
# Copiar de front-lojas/src/types/index.ts
```

### 2. Criar Validações
**Arquivo:** `src/lib/validations.ts`
```bash
# Copiar de front-lojas/src/lib/validations.ts
```

### 3. Expandir ProductsPage
**Origem:** `front-lojas/src/app/(dashboard)/products/page.tsx`

**Componentes necessários:**
- `src/components/products/products-table.tsx`
- `src/components/products/product-dialog.tsx`
- `src/components/products/product-filters.tsx`

**Adaptações:**
- Remover `'use client'`
- Trocar `useRouter` por navegação via props
- Trocar `useAuth` hook pelo context
- Verificar autorizações (roles)

### 4. Expandir CustomersPage
**Origem:** `front-lojas/src/app/(dashboard)/customers/page.tsx`

**Componentes necessários:**
- `src/components/customers/customers-table.tsx`
- `src/components/customers/customer-dialog.tsx`

**Adaptações:**
- Mesmas do ProductsPage

### 5. Expandir Outras Páginas
Seguir o mesmo padrão:
1. Copiar página do frontend
2. Adaptar imports
3. Adaptar navegação
4. Verificar autorizações
5. Testar funcionalidades

## 📝 Checklist de Adaptações

Ao copiar qualquer página:

- [ ] Remover `'use client'`
- [ ] Remover `import { useRouter } from 'next/navigation'`
- [ ] Remover `import Link from 'next/link'`
- [ ] Remover `import Image from 'next/image'`
- [ ] Trocar `useAuth` hook por `useAuth` do context
- [ ] Trocar `router.push('/route')` por `onNavigate('route')`
- [ ] Verificar autorizações baseadas em roles
- [ ] Garantir endpoints corretos
- [ ] Testar estilizações

## 🔍 Verificação de Autorizações

Todas as páginas devem verificar:
```tsx
const { user } = useAuth();
const canManage = user?.role === 'empresa' || user?.role === 'admin';
const isCompany = user?.role === 'empresa';
const isAdmin = user?.role === 'admin';
const isSeller = user?.role === 'vendedor';
```

## 📂 Estrutura de Componentes

```
src/components/
├── sales/ ✅
│   ├── product-list.tsx ✅
│   ├── cart.tsx ✅
│   ├── barcode-scanner.tsx ✅
├── products/ ⏳
│   ├── products-table.tsx ⏳
│   ├── product-dialog.tsx ⏳
│   ├── product-filters.tsx ⏳
├── customers/ ⏳
│   ├── customers-table.tsx ⏳
│   ├── customer-dialog.tsx ⏳
└── ...
```

## 🚀 Ordem de Prioridade

1. **ALTA** - ProductsPage (CRUD completo)
2. **ALTA** - CustomersPage (CRUD completo)
3. **MÉDIA** - SellersPage, SalesHistoryPage
4. **MÉDIA** - ReportsPage, BillsPage, InstallmentsPage
5. **BAIXA** - Configurações e outras páginas

## ✅ Funcionalidades Garantidas

- ✅ Estrutura base completa
- ✅ Navegação funcional
- ✅ Dashboard completo
- ✅ PDV funcional (SalesPage)
- ✅ Carrinho de compras
- ✅ Sistema de dispositivos
- ✅ Download de drivers

## 🎯 Meta Final

Todas as páginas devem ter:
- ✅ Mesmas funcionalidades do frontend web
- ✅ Mesmas estilizações
- ✅ Mesmas autorizações
- ✅ Mesmos endpoints
- ✅ Totalmente funcionais

