# MontShop Desktop

Sistema desktop do MontShop desenvolvido com Electron, React, TypeScript e Tailwind CSS.

## 🚀 Funcionalidades

- ✅ Interface totalmente personalizada com janela customizada
- ✅ Detecção automática de impressoras e balanças
- ✅ Instalação automática de drivers
- ✅ Integração com API do MontShop
- ✅ Atualização automática via GitHub releases
- ✅ Suporte a tema claro/escuro baseado no sistema operacional
- ✅ Janela sem bordas padrão do sistema

## 🛠️ Tecnologias

- **Electron** - Framework para aplicações desktop
- **React 18** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **Vite** - Build tool
- **React Query** - Gerenciamento de estado servidor
- **Zustand** - Gerenciamento de estado local

## 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn

## 🔧 Instalação

```bash
npm install
```

## 🏃 Desenvolvimento

```bash
# Desenvolvimento (com hot reload)
npm run dev

# Build para produção
npm run build

# Build para Windows
npm run build:win

# Build para macOS
npm run build:mac

# Build para Linux
npm run build:linux
```

## 📦 Build e Distribuição

O projeto usa Electron Builder para criar instaladores:

- **Windows**: Instalador NSIS (.exe)
- **macOS**: DMG (.dmg)
- **Linux**: AppImage (.AppImage)

Os arquivos serão gerados na pasta `release/`.

## 🔐 Configuração da API

A aplicação está configurada para usar a API em:
`https://montshop-api-qi3v4.ondigitalocean.app`

Para alterar, edite `src/lib/apiClient.ts`.

## 🎨 Personalização

O sistema detecta automaticamente o tema do sistema operacional e aplica cores de destaque quando disponíveis.

### Janela Customizada

A janela é totalmente customizada sem bordas padrão do sistema. Os controles (minimizar, maximizar, fechar) estão na barra de título.

### Dispositivos

O sistema detecta automaticamente:
- **Impressoras**: Lista todas as impressoras instaladas no sistema
- **Balanças**: Detecta portas seriais (COM no Windows, /dev/tty* no Linux/macOS)

### Atualização Automática

As atualizações são verificadas automaticamente via GitHub releases. Quando uma nova versão está disponível, o usuário é notificado e pode baixar e instalar.

## 📝 Estrutura do Projeto

```
montshop-desktop/
├── electron/           # Código do Electron (main process)
│   ├── main.ts        # Processo principal
│   ├── preload.ts     # Script de preload
│   └── handlers/      # Handlers IPC
├── src/               # Código React (renderer process)
│   ├── components/    # Componentes React
│   ├── contexts/      # Contextos React
│   ├── lib/           # Utilitários
│   └── App.tsx        # Componente principal
└── build/             # Arquivos de build (ícones, etc.)
```

## 🔧 Configuração de Auto-Update

Para configurar atualizações automáticas via GitHub:

1. Configure o repositório no `package.json`:
```json
"publish": {
  "provider": "github",
  "owner": "seu-usuario",
  "repo": "MontShop"
}
```

2. Crie releases no GitHub com tags no formato `v1.0.0`

3. O sistema verificará automaticamente por atualizações

## 📄 Licença

Este projeto é privado.

