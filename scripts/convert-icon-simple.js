const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Script para converter logo.png para icon.ico usando sharp
const sourcePath = path.join(__dirname, '../public/logo.png');
const destPath = path.join(__dirname, '../build/icon.ico');

// Criar diretório build se não existir
const buildDir = path.dirname(destPath);
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// Converter PNG para ICO usando sharp
async function convertIcon() {
  try {
    if (!fs.existsSync(sourcePath)) {
      console.warn('⚠ Aviso: logo.png não encontrado em', sourcePath);
      console.log('⚠ Continuando sem conversão de ícone - electron-builder usará ícone padrão');
      return;
    }

    console.log('Convertendo logo.png para icon.ico...');
    
    // Converter PNG para ICO usando sharp + png-to-ico
    const { imagesToIco } = require('png-to-ico');
    
    // Criar múltiplos tamanhos para o ICO (16x16, 32x32, 48x48, 256x256)
    const sizes = [16, 32, 48, 256];
    const images = await Promise.all(
      sizes.map(size => 
        sharp(sourcePath)
          .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
          .png()
          .toBuffer()
      )
    );
    
    // Converter para ICO usando png-to-ico
    const ico = await imagesToIco(images);
    fs.writeFileSync(destPath, ico);
    console.log('✓ Ícone convertido com sucesso para build/icon.ico');
  } catch (error) {
    console.warn('⚠ Aviso: Erro ao converter ícone:', error.message);
    console.log('⚠ Continuando sem ícone customizado - electron-builder converterá automaticamente do PNG');
    // Não bloquear o build se a conversão falhar
  }
}

convertIcon();

