# 🔧 Como Limpar o Cache do Auto-Updater

Se você está tendo problemas onde o instalador baixa a versão antiga mesmo após desinstalar, o problema pode estar no cache do electron-updater.

## 📍 Localização do Cache

O cache do electron-updater no Windows geralmente fica em:

```
%LOCALAPPDATA%\montshop-desktop-updater\
```

Ou em:

```
%APPDATA%\montshop-desktop\
```

## 🗑️ Como Limpar o Cache Manualmente

### Método 1: Via Explorador de Arquivos

1. Pressione `Windows + R`
2. Digite `%LOCALAPPDATA%` e pressione Enter
3. Procure pela pasta `montshop-desktop-updater` ou `montshop-desktop`
4. Delete a pasta inteira
5. Repita o processo para `%APPDATA%`

### Método 2: Via PowerShell (Execute como Administrador)

```powershell
# Limpar cache do updater
Remove-Item -Path "$env:LOCALAPPDATA\montshop-desktop-updater" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$env:APPDATA\montshop-desktop" -Recurse -Force -ErrorAction SilentlyContinue

# Limpar cache do Electron
Remove-Item -Path "$env:LOCALAPPDATA\montshop-desktop" -Recurse -Force -ErrorAction SilentlyContinue
```

### Método 3: Desinstalação Completa

1. **Desinstalar o aplicativo** via Painel de Controle
2. **Remover pastas restantes:**
   - `C:\Program Files\MontShop Desktop` (ou `C:\Program Files (x86)\MontShop Desktop`)
   - `%LOCALAPPDATA%\montshop-desktop-updater`
   - `%APPDATA%\montshop-desktop`
   - `%LOCALAPPDATA%\montshop-desktop`
3. **Limpar registro do Windows** (opcional, use Revo Uninstaller ou similar)
4. **Reinstalar** a versão mais recente

## 🔍 Verificar se o Problema está no GitHub Release

O problema pode estar no arquivo `latest.yml` do GitHub que não foi atualizado corretamente.

### Como Verificar:

1. Vá para: https://github.com/luizaugustom/montshop-desktop/releases
2. Verifique qual release está marcado como "Latest release"
3. Abra o release e verifique se o arquivo `latest.yml` está presente
4. Abra o arquivo `latest.yml` e verifique se a versão está correta:

```yaml
version: 1.0.1
files:
  - url: MontShop-Desktop-Setup-1.0.1.exe
    sha512: ...
    size: ...
path: MontShop-Desktop-Setup-1.0.1.exe
sha512: ...
releaseDate: '...'
```

### Se o latest.yml estiver incorreto:

1. Faça um novo build: `npm run build:win -- --publish=always`
2. Isso deve gerar um novo `latest.yml` automaticamente
3. Verifique se o release correto está marcado como "Latest release" no GitHub

## ✅ Solução Recomendada

1. **Limpe o cache** usando um dos métodos acima
2. **Verifique o release no GitHub** - certifique-se de que a versão 1.0.1 está marcada como "Latest"
3. **Desinstale completamente** o aplicativo antigo
4. **Baixe e instale manualmente** a versão 1.0.1 diretamente do GitHub:
   - https://github.com/luizaugustom/montshop-desktop/releases/latest
   - Baixe o arquivo `MontShop-Desktop-Setup-1.0.1.exe`
5. **Instale como administrador** (clique com botão direito > Executar como administrador)

## 📝 Logs para Diagnóstico

Após as correções, os logs do aplicativo agora mostram informações detalhadas:

- Versão atual instalada
- Versão disponível no GitHub
- Versão baixada
- Avisos se a versão baixada for igual à atual

Os logs ficam em: `%APPDATA%\montshop-desktop\logs\`

