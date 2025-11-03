# 🚀 Guia de Produção - MontShop Desktop

Este guia explica como colocar o MontShop Desktop em produção com atualizações automáticas via GitHub.

## 📋 Pré-requisitos

1. **GitHub Repository**: Um repositório GitHub onde o código está hospedado
2. **GitHub Token**: Um token de acesso pessoal com permissões de `repo` (para releases)
3. **Node.js**: Versão 18 ou superior instalada

## 🔧 Configuração do GitHub

### 1. Configurar o Repositório no package.json

Edite o arquivo `package.json` e atualize a seção `publish` com suas informações:

```json
"publish": {
  "provider": "github",
  "owner": "SEU-USUARIO-GITHUB",  // Seu nome de usuário do GitHub
  "repo": "montshop-desktop",      // Nome do repositório
  "releaseType": "release",
  "private": false
}
```

### 2. Criar um Token de Acesso do GitHub

1. Acesse: https://github.com/settings/tokens
2. Clique em "Generate new token (classic)"
3. Dê um nome para o token (ex: "MontShop Desktop Releases")
4. Marque a permissão: **`repo`** (Full control of private repositories)
5. Clique em "Generate token"
6. **Copie o token imediatamente** (você não poderá vê-lo novamente)

### 3. Configurar Variável de Ambiente

#### Windows (PowerShell):
```powershell
$env:GH_TOKEN="seu-token-aqui"
```

#### Windows (CMD):
```cmd
set GH_TOKEN=seu-token-aqui
```

#### Linux/macOS:
```bash
export GH_TOKEN="seu-token-aqui"
```

**⚠️ IMPORTANTE**: Para tornar permanente, adicione ao seu arquivo de perfil do shell:
- Windows: Variáveis de Ambiente do Sistema
- Linux/macOS: `~/.bashrc` ou `~/.zshrc`

### 4. Autenticação Alternativa (Via arquivo)

Crie um arquivo `.env` na raiz do projeto:

```
GH_TOKEN=seu-token-aqui
```

Instale o pacote `dotenv` se necessário (já deve estar no projeto).

## 🏗️ Build e Publicação

### Build Local (Teste)

```bash
# Build para Windows
npm run build:win

# Os arquivos serão gerados em: release/
```

### Build e Publicação no GitHub

Para publicar automaticamente no GitHub:

```bash
# Windows
npm run build:win -- --publish=always

# Ou use o electron-builder diretamente
npx electron-builder --win --publish=always
```

O comando vai:
1. Compilar a aplicação
2. Criar o instalador (.exe)
3. Criar um release no GitHub
4. Fazer upload dos arquivos do release

### Primeira Publicação

Na primeira vez, você precisa criar um release inicial manualmente:

1. Vá para: `https://github.com/SEU-USUARIO/montshop-desktop/releases`
2. Clique em "Create a new release"
3. Tag: `v1.0.0` (formato: `v[versão]`)
4. Title: `MontShop Desktop v1.0.0`
5. Description: Descrição da versão
6. Clique em "Publish release"

### Versões Subsequentes

Para novas versões, edite o `package.json`:

```json
{
  "version": "1.0.1"  // Incremente o número da versão
}
```

Depois execute:

```bash
npm run build:win -- --publish=always
```

O electron-builder vai:
- Criar automaticamente o tag `v1.0.1`
- Criar um novo release
- Fazer upload dos arquivos

## 🔄 Sistema de Atualizações Automáticas

O aplicativo está configurado para:

1. **Verificar atualizações automaticamente** ao iniciar
2. **Verificar a cada 4 horas** enquanto está em execução
3. **Baixar automaticamente** quando uma atualização está disponível
4. **Instalar automaticamente** ao fechar o aplicativo (ou manualmente via botão)

### Como Funciona

- O aplicativo verifica releases no GitHub usando a tag `latest`
- Compara a versão local com a versão do release
- Se houver atualização, baixa automaticamente em segundo plano
- Quando o download termina, notifica o usuário
- Ao fechar o aplicativo, instala a atualização automaticamente

## 📦 Estrutura do Release no GitHub

O release deve conter:

- `MontShop-Desktop-Setup-{versão}.exe` - Instalador NSIS
- `latest.yml` - Metadados para atualização automática (gerado automaticamente)
- `MontShop Desktop-{versão}-win.zip` - Arquivo ZIP (opcional, gerado automaticamente)

## 🎨 Personalização do Instalador

O instalador está configurado com:

- ✅ Ícone personalizado (logo.png)
- ✅ Atalhos no desktop e menu iniciar
- ✅ Permissão para escolher diretório de instalação
- ✅ Registro no sistema para controle de versão

### Arquivo de Configuração

Edite `build/installer.nsh` para personalizar ainda mais:
- Textos do instalador
- Mensagens personalizadas
- Comportamento de instalação

## 🐛 Troubleshooting

### Erro: "Cannot find GitHub token"

**Solução**: Configure a variável `GH_TOKEN` (veja seção 3)

### Erro: "Repository not found"

**Solução**: 
1. Verifique se o `owner` e `repo` estão corretos no `package.json`
2. Verifique se o token tem permissão `repo`
3. Verifique se o repositório existe e é acessível

### Atualizações não estão sendo detectadas

**Solução**:
1. Verifique se o release foi criado corretamente no GitHub
2. Verifique se a tag está no formato `v{versão}` (ex: `v1.0.0`)
3. Verifique se o arquivo `latest.yml` está presente no release
4. Verifique os logs do aplicativo: `%USERPROFILE%\AppData\Roaming\montshop-desktop\logs`

### Build falha

**Solução**:
1. Limpe a pasta `release/`: `npm run clean`
2. Limpe os node_modules: `rm -rf node_modules && npm install`
3. Verifique se todas as dependências estão instaladas

## 📝 Checklist de Lançamento

Antes de fazer o build de produção:

- [ ] Versão atualizada no `package.json`
- [ ] `GH_TOKEN` configurado
- [ ] `owner` e `repo` corretos no `package.json`
- [ ] `logo.png` presente em `public/`
- [ ] Testes realizados localmente
- [ ] Changelog atualizado (opcional mas recomendado)

## 🎯 Workflow Recomendado

1. **Desenvolvimento**: Desenvolva e teste localmente
2. **Versão**: Incremente a versão no `package.json`
3. **Commit**: Faça commit das mudanças
4. **Tag**: Crie uma tag git: `git tag v1.0.1`
5. **Push**: `git push origin main --tags`
6. **Build**: `npm run build:win -- --publish=always`
7. **Verificação**: Verifique o release no GitHub

## 📞 Suporte

Para problemas relacionados ao electron-builder, consulte:
- Documentação: https://www.electron.build/
- Issues: https://github.com/electron-userland/electron-builder/issues

