# Instruções de Uso - MontShop Desktop

## 📋 Resumo do Sistema

O MontShop Desktop é uma aplicação desktop completa e independente do frontend web, desenvolvida com Electron. O sistema possui:

### ✅ Funcionalidades Implementadas

1. **Interface Totalmente Customizada**
   - Janela sem bordas padrão do sistema
   - Barra de título customizada com controles próprios
   - Tema automático baseado no sistema operacional
   - Cores de destaque do sistema aplicadas automaticamente

2. **Detecção de Dispositivos**
   - **Impressoras**: Detecta automaticamente todas as impressoras instaladas
   - **Balanças**: Detecta portas seriais (COM no Windows, /dev/tty* no Linux/macOS)
   - Instalação automática de drivers quando necessário

3. **Integração com API**
   - Integrado com `https://montshop-api-qi3v4.ondigitalocean.app`
   - Autenticação JWT com refresh automático
   - Envio do ID do computador em todas as requisições

4. **Atualização Automática**
   - Verifica atualizações automaticamente ao iniciar
   - Notificação quando há nova versão disponível
   - Download e instalação automática via GitHub releases

5. **Instalador Personalizado**
   - Instalador NSIS para Windows
   - Permite escolha do diretório de instalação
   - Cria atalhos no desktop e menu iniciar

## 🚀 Como Usar

### Desenvolvimento

```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev

# Em outro terminal, executar o Electron
npm run electron:dev
```

### Build para Produção

```bash
# Build para Windows
npm run build:win

# Build para macOS
npm run build:mac

# Build para Linux
npm run build:linux
```

Os instaladores serão gerados na pasta `release/`.

## 🔧 Configurações Importantes

### 1. Atualização Automática via GitHub

Para habilitar atualizações automáticas, configure no `package.json`:

```json
"publish": {
  "provider": "github",
  "owner": "seu-usuario-github",
  "repo": "MontShop"
}
```

**Importante**: As releases no GitHub devem seguir o formato de tag `v1.0.0` para funcionar corretamente.

### 2. Ícones do Aplicativo

Os ícones devem estar na pasta `build/`:
- Windows: `build/icon.ico`
- macOS: `build/icon.icns`
- Linux: `build/icon.png`

### 3. API Base URL

A URL da API está configurada em `src/lib/apiClient.ts`:

```typescript
const API_BASE_URL = 'https://montshop-api-qi3v4.ondigitalocean.app';
```

## 📁 Estrutura do Projeto

```
montshop-desktop/
├── electron/                    # Código do Electron (Main Process)
│   ├── main.ts                 # Processo principal
│   ├── preload.ts              # Script de preload (Bridge)
│   └── handlers/               # Handlers IPC
│       ├── device-handlers.ts  # Handlers de dispositivos
│       ├── printer-handlers.ts # Handlers de impressoras
│       └── scale-handlers.ts   # Handlers de balanças
├── src/                        # Código React (Renderer Process)
│   ├── components/             # Componentes React
│   │   ├── layout/            # Layout (TitleBar, etc.)
│   │   ├── pages/             # Páginas da aplicação
│   │   └── ui/                # Componentes UI reutilizáveis
│   ├── contexts/              # Contextos React
│   │   ├── AuthContext.tsx    # Contexto de autenticação
│   │   ├── UIContext.tsx      # Contexto de UI
│   │   └── DeviceContext.tsx  # Contexto de dispositivos
│   ├── lib/                   # Utilitários
│   │   ├── apiClient.ts       # Cliente HTTP (Axios)
│   │   └── utils.ts           # Funções utilitárias
│   ├── types/                 # Definições TypeScript
│   │   └── electron.d.ts      # Tipos do Electron API
│   ├── App.tsx                # Componente principal
│   └── main.tsx               # Ponto de entrada
├── build/                     # Arquivos de build
│   └── installer.nsh          # Script NSIS customizado
├── package.json               # Configurações do projeto
├── vite.config.ts             # Configuração do Vite
├── tailwind.config.ts         # Configuração do Tailwind
└── tsconfig.json              # Configuração do TypeScript
```

## 🔐 Funcionalidades de Segurança

1. **Context Isolation**: Habilitado - o código do renderer não tem acesso direto ao Node.js
2. **Node Integration**: Desabilitado - maior segurança
3. **Sandbox**: Desabilitado (necessário para alguns recursos do Electron)

## 🖨️ Impressoras e Balanças

### Impressoras

O sistema detecta impressoras usando:
- **Windows**: WMI (Windows Management Instrumentation)
- **macOS/Linux**: Comando `lpstat`

### Balanças

O sistema detecta balanças através de portas seriais:
- **Windows**: Portas COM via WMI
- **macOS**: `/dev/tty.*`
- **Linux**: `/dev/ttyUSB*` e `/dev/ttyACM*`

**Nota**: Para uso em produção com balanças reais, será necessário integrar uma biblioteca específica como `serialport` para comunicação serial.

## 🎨 Personalização da Interface

### Tema do Sistema

O sistema detecta automaticamente:
- Tema claro/escuro do sistema operacional
- Cores de destaque (accent colors) quando disponíveis

### Janela Customizada

A janela é totalmente customizada com:
- Sem bordas padrão do sistema (`frame: false`)
- Barra de título própria com controles customizados
- Responsiva ao tema do sistema

## 📝 Notas Importantes

1. **Drivers**: A instalação automática de drivers está implementada de forma básica. Para produção, será necessário integrar com instaladores específicos dos fabricantes.

2. **Balanças**: A comunicação com balanças está simulada. Para produção, use bibliotecas como `serialport` ou específicas do fabricante.

3. **Impressão**: A impressão usa comandos do sistema operacional. Para impressoras térmicas específicas, considere usar bibliotecas como `node-thermal-printer`.

4. **Atualizações**: Certifique-se de configurar corretamente o repositório GitHub para que as atualizações funcionem.

## 🐛 Troubleshooting

### Aplicação não inicia

- Verifique se todas as dependências estão instaladas: `npm install`
- Verifique os logs no console

### Dispositivos não são detectados

- Verifique as permissões do sistema
- No Windows, execute como administrador para melhor detecção
- Verifique se os drivers estão instalados

### Atualizações não funcionam

- Verifique se o repositório GitHub está configurado corretamente
- Certifique-se de que as releases estão no formato correto (v1.0.0)
- Verifique os logs do auto-updater

## 📞 Suporte

Para dúvidas ou problemas, consulte a documentação do projeto ou entre em contato com a equipe de desenvolvimento.

