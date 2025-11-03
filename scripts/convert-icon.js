const fs = require('fs');
const path = require('path');
const { imagesToIco } = require('png-to-ico');

const sourcePath = path.join(__dirname, '../public/logo.png');
const destPath = path.join(__dirname, '../build/icon.ico');

// Criar diretório build se não existir
const buildDir = path.dirname(destPath);
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// Converter PNG para ICO
async function convertIcon() {
  try {
    if (!fs.existsSync(sourcePath)) {
      console.error('✗ Erro: logo.png não encontrado em', sourcePath);
      process.exit(1);
    }

    console.log('Convertendo logo.png para icon.ico...');
    const ico = await imagesToIco([sourcePath]);
    fs.writeFileSync(destPath, ico);
    console.log('✓ Ícone convertido com sucesso para build/icon.ico');
  } catch (error) {
    console.error('✗ Erro ao converter ícone:', error.message);
    console.log('⚠ Tentando copiar PNG como fallback...');
    // Fallback: copiar PNG se conversão falhar
    try {
      fs.copyFileSync(sourcePath, destPath);
      console.log('✓ PNG copiado (pode não funcionar no NSIS)');
    } catch (copyError) {
      console.error('✗ Erro ao copiar arquivo:', copyError.message);
      process.exit(1);
    }
  }
}

convertIcon();

