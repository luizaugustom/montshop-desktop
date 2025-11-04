/**
 * Script para limpar o cache do electron-updater
 * Execute este script antes de fazer um novo build para garantir que não há cache antigo
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const platform = os.platform();

function getCachePaths() {
  const paths = [];
  
  if (platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    
    paths.push(
      path.join(localAppData, 'montshop-desktop-updater'),
      path.join(appData, 'montshop-desktop'),
      path.join(localAppData, 'montshop-desktop')
    );
  } else if (platform === 'darwin') {
    const home = os.homedir();
    paths.push(
      path.join(home, 'Library', 'Caches', 'montshop-desktop-updater'),
      path.join(home, 'Library', 'Application Support', 'montshop-desktop')
    );
  } else {
    // Linux
    const home = os.homedir();
    paths.push(
      path.join(home, '.cache', 'montshop-desktop-updater'),
      path.join(home, '.config', 'montshop-desktop')
    );
  }
  
  return paths;
}

function removeCache(pathToRemove) {
  try {
    if (fs.existsSync(pathToRemove)) {
      console.log(`Removendo: ${pathToRemove}`);
      fs.rmSync(pathToRemove, { recursive: true, force: true });
      console.log(`✓ Removido com sucesso`);
      return true;
    } else {
      console.log(`⊘ Não encontrado: ${pathToRemove}`);
      return false;
    }
  } catch (error) {
    console.error(`✗ Erro ao remover ${pathToRemove}:`, error.message);
    return false;
  }
}

function cleanCache() {
  console.log('🧹 Limpando cache do electron-updater...\n');
  
  const cachePaths = getCachePaths();
  let removedCount = 0;
  
  cachePaths.forEach(cachePath => {
    if (removeCache(cachePath)) {
      removedCount++;
    }
  });
  
  console.log(`\n✅ Limpeza concluída. ${removedCount} diretório(s) removido(s).`);
  
  if (removedCount === 0) {
    console.log('\nℹ️  Nenhum cache encontrado. Isso é normal se você nunca executou o aplicativo antes.');
  }
}

if (require.main === module) {
  cleanCache();
}

module.exports = { cleanCache, getCachePaths };

