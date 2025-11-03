# 📋 Próximos Passos Detalhados - Implementação

## 🎯 Fase 1: Estrutura de Navegação (Prioridade ALTA)

### 1.1 Criar Sidebar
**Arquivo**: `src/components/layout/Sidebar.tsx`

```typescript
// Baseado em front-lojas/src/components/layout/sidebar.tsx
// Adaptar para desktop sem Next.js Link
// Usar roteamento manual com estado
```

**Tarefas**:
- [ ] Copiar estrutura do sidebar do frontend
- [ ] Adaptar navegação para desktop (sem Next.js)
- [ ] Implementar menu colapsável
- [ ] Adicionar filtros por role
- [ ] Integrar com contexto de UI

### 1.2 Sistema de Roteamento
**Arquivo**: `src/components/routing/AppRouter.tsx` (expandir)

**Tarefas**:
- [ ] Criar roteamento manual (sem Next.js)
- [ ] Implementar navegação por estado
- [ ] Proteger rotas por autenticação
- [ ] Proteger rotas por role

### 1.3 Layout Completo
**Arquivo**: `src/components/layout/MainLayout.tsx` (novo)

**Tarefas**:
- [ ] Layout com Sidebar + Header + Content
- [ ] Responsivo para diferentes tamanhos
- [ ] Suporte a modo colapsado/expandido

## 🎯 Fase 2: Integrar Páginas Principais (Prioridade ALTA)

### 2.1 Dashboard Completo
**Arquivo**: `src/components/pages/DashboardPage.tsx` (expandir)

**Componentes a copiar**:
- `front-lojas/src/app/(dashboard)/dashboard/page.tsx`
- Métricas, gráficos, cards

### 2.2 Página de Vendas (PDV)
**Arquivo**: `src/components/pages/SalesPage.tsx` (novo)

**Componentes a copiar**:
- `front-lojas/src/app/(dashboard)/sales/page.tsx`
- `front-lojas/src/components/sales/*` (todos)

**Funcionalidades especiais para desktop**:
- Integração com balança para peso
- Impressão automática de cupom
- Leitura de código de barras via scanner

### 2.3 Página de Produtos
**Arquivo**: `src/components/pages/ProductsPage.tsx` (novo)

**Componentes a copiar**:
- `front-lojas/src/app/(dashboard)/products/page.tsx`
- `front-lojas/src/components/products/*` (todos)

### 2.4 Página de Clientes
**Arquivo**: `src/components/pages/CustomersPage.tsx` (novo)

**Componentes a copiar**:
- `front-lojas/src/app/(dashboard)/customers/page.tsx`
- `front-lojas/src/components/customers/*` (todos)

### 2.5 Outras Páginas
- [ ] Vendedores
- [ ] Histórico de Vendas
- [ ] Relatórios
- [ ] Contas a Pagar
- [ ] Parcelas
- [ ] Fechamento de Caixa

## 🎯 Fase 3: Componentes UI Faltantes (Prioridade MÉDIA)

### Componentes a Criar/Copiar:
- [ ] Card (`src/components/ui/card.tsx`)
- [ ] Table (`src/components/ui/table.tsx`)
- [ ] Tabs (`src/components/ui/tabs.tsx`)
- [ ] Popover (`src/components/ui/popover.tsx`)
- [ ] Tooltip (`src/components/ui/tooltip.tsx`)
- [ ] Progress (`src/components/ui/progress.tsx`)
- [ ] Calendar (`src/components/ui/calendar.tsx`)
- [ ] Date Picker (`src/components/ui/date-picker.tsx`)
- [ ] Scroll Area (`src/components/ui/scroll-area.tsx`)
- [ ] Dropdown Menu (`src/components/ui/dropdown-menu.tsx`)
- [ ] Alert (`src/components/ui/alert.tsx`)

## 🎯 Fase 4: Integração com Dispositivos (Prioridade ALTA)

### 4.1 Impressoras - Implementação Real
**Arquivo**: `electron/utils/thermal-printer.ts` (melhorar)

**Tarefas**:
- [ ] Testar `node-thermal-printer` com impressoras reais
- [ ] Implementar formatação de cupom fiscal
- [ ] Suporte a cortes de papel
- [ ] Abertura de gaveta
- [ ] Tratamento de erros robusto

### 4.2 Balanças - Comunicação Serial
**Arquivo**: `electron/handlers/scale-handlers.ts` (reescrever)

**Tarefas**:
- [ ] Integrar `serialport` corretamente
- [ ] Suportar protocolos específicos:
  - Toledo
  - Filizola
  - Urano
  - Genérico (padrão de mercado)
- [ ] Leitura contínua de peso
- [ ] Calibração e zeramento
- [ ] Integração com vendas

## 🎯 Fase 5: Assets e Build (Prioridade MÉDIA)

### 5.1 Ícones
**Local**: `build/`

**Tarefas**:
- [ ] Criar ícone .ico (Windows) - múltiplos tamanhos
- [ ] Criar ícone .icns (macOS) - múltiplos tamanhos
- [ ] Criar ícone .png (Linux) - múltiplos tamanhos
- [ ] Testar em diferentes resoluções

### 5.2 Build de Produção
**Tarefas**:
- [ ] Testar build Windows
- [ ] Testar build macOS
- [ ] Testar build Linux
- [ ] Verificar tamanho do instalador
- [ ] Testar instalação em máquinas limpas

## 🎯 Fase 6: Configuração Final (Prioridade BAIXA)

### 6.1 Auto-Update
**Tarefas**:
- [ ] Configurar GitHub releases
- [ ] Testar atualização automática
- [ ] Configurar changelog

### 6.2 Documentação
**Tarefas**:
- [ ] Manual do usuário
- [ ] Guia de instalação
- [ ] FAQ
- [ ] Vídeo tutorial (opcional)

## 🚀 Início Rápido - Próximo Passo Imediato

Para começar AGORA, sugiro:

1. **Criar Sidebar** - É a base de tudo
2. **Copiar Dashboard completo** - Para ter algo visual
3. **Integrar página de Vendas** - Funcionalidade mais importante

Quer que eu comece por algum desses?

