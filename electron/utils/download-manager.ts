/**
 * Gerenciador de downloads de drivers
 * Implementa download HTTP/HTTPS com progresso e verificação de integridade
 */

import https from 'https';
import http from 'http';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createWriteStream, existsSync } from 'fs';
import { app } from 'electron';
import crypto from 'crypto';

export interface DownloadProgress {
  received: number;
  total: number;
  percentage: number;
  speed: number; // bytes per second
}

export interface DownloadOptions {
  url: string;
  destination: string;
  expectedHash?: string;
  hashAlgorithm?: 'md5' | 'sha256';
  onProgress?: (progress: DownloadProgress) => void;
  timeout?: number;
  retries?: number;
}

export interface DownloadResult {
  success: boolean;
  filePath: string;
  error?: string;
  hash?: string;
  verified?: boolean;
}

/**
 * Faz download de um arquivo com suporte a progresso
 */
export async function downloadFile(options: DownloadOptions): Promise<DownloadResult> {
  const {
    url,
    destination,
    expectedHash,
    hashAlgorithm = 'sha256',
    onProgress,
    timeout = 300000, // 5 minutos
    retries = 3,
  } = options;

  // Criar diretório de destino se não existir
  const destDir = path.dirname(destination);
  await fs.mkdir(destDir, { recursive: true });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Tentativa ${attempt + 1} de ${retries + 1} para baixar ${url}`);
        // Aguardar antes de tentar novamente (backoff exponencial)
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }

      const result = await downloadFileAttempt({
        url,
        destination,
        onProgress,
        timeout,
      });

      // Verificar hash se fornecido
      if (expectedHash) {
        const calculatedHash = await calculateFileHash(destination, hashAlgorithm);
        const verified = calculatedHash.toLowerCase() === expectedHash.toLowerCase();

        if (!verified) {
          await fs.unlink(destination).catch(() => {});
          throw new Error(
            `Verificação de integridade falhou. Esperado: ${expectedHash}, Obtido: ${calculatedHash}`
          );
        }

        result.verified = true;
        result.hash = calculatedHash;
      } else {
        // Calcular hash mesmo se não fornecido para referência
        result.hash = await calculateFileHash(destination, hashAlgorithm);
      }

      return result;
    } catch (error: any) {
      lastError = error;
      console.error(`Erro no download (tentativa ${attempt + 1}):`, error.message);

      // Se não for o último tentativa, continuar
      if (attempt < retries) {
        // Limpar arquivo parcial se existir
        try {
          if (existsSync(destination)) {
            await fs.unlink(destination);
          }
        } catch {}
        continue;
      }
    }
  }

  return {
    success: false,
    filePath: destination,
    error: lastError?.message || 'Falha no download após todas as tentativas',
  };
}

/**
 * Tenta fazer download do arquivo
 */
function downloadFileAttempt(options: {
  url: string;
  destination: string;
  onProgress?: (progress: DownloadProgress) => void;
  timeout: number;
}): Promise<DownloadResult> {
  return new Promise((resolve, reject) => {
    const { url, destination, onProgress, timeout } = options;
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;

    const file = createWriteStream(destination);
    let receivedBytes = 0;
    let totalBytes = 0;
    let startTime = Date.now();
    let lastProgressTime = Date.now();
    let lastProgressBytes = 0;

    const request = client.get(url, (response) => {
      // Verificar status code
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Redirecionamento
        file.close();
        fs.unlink(destination).catch(() => {});
        if (response.headers.location) {
          return downloadFileAttempt({
            url: response.headers.location,
            destination,
            onProgress,
            timeout,
          }).then(resolve).catch(reject);
        }
        return reject(new Error('Redirecionamento sem URL de destino'));
      }

      if (response.statusCode && response.statusCode >= 400) {
        file.close();
        fs.unlink(destination).catch(() => {});
        return reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
      }

      // Obter tamanho total do arquivo
      totalBytes = parseInt(response.headers['content-length'] || '0', 10);

      response.on('data', (chunk: Buffer) => {
        receivedBytes += chunk.length;
        file.write(chunk);

        // Calcular progresso
        const now = Date.now();
        const timeDiff = (now - lastProgressTime) / 1000; // segundos
        const bytesDiff = receivedBytes - lastProgressBytes;
        const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;

        if (onProgress) {
          onProgress({
            received: receivedBytes,
            total: totalBytes || receivedBytes,
            percentage: totalBytes > 0 ? (receivedBytes / totalBytes) * 100 : 0,
            speed,
          });
        }

        lastProgressTime = now;
        lastProgressBytes = receivedBytes;
      });

      response.on('end', () => {
        file.end();
        resolve({
          success: true,
          filePath: destination,
        });
      });
    });

    request.on('error', (error) => {
      file.close();
      fs.unlink(destination).catch(() => {});
      reject(error);
    });

    request.setTimeout(timeout, () => {
      request.destroy();
      file.close();
      fs.unlink(destination).catch(() => {});
      reject(new Error('Timeout no download'));
    });

    file.on('error', (error) => {
      request.destroy();
      fs.unlink(destination).catch(() => {});
      reject(error);
    });
  });
}

/**
 * Calcula hash de um arquivo
 */
async function calculateFileHash(
  filePath: string,
  algorithm: 'md5' | 'sha256' = 'sha256'
): Promise<string> {
  const hash = crypto.createHash(algorithm);
  const fileBuffer = await fs.readFile(filePath);
  hash.update(fileBuffer);
  return hash.digest('hex');
}

/**
 * Obtém caminho do diretório de cache de drivers
 */
export function getDriversCacheDir(): string {
  return path.join(app.getPath('userData'), 'drivers', 'printers', 'cache');
}

/**
 * Verifica se arquivo já está em cache
 */
export async function getCachedFile(fileName: string, expectedHash?: string): Promise<string | null> {
  const cacheDir = getDriversCacheDir();
  const cachedPath = path.join(cacheDir, fileName);

  try {
    // Verificar se arquivo existe
    if (!existsSync(cachedPath)) {
      return null;
    }

    // Verificar hash se fornecido
    if (expectedHash) {
      const hash = await calculateFileHash(cachedPath, 'sha256');
      if (hash.toLowerCase() !== expectedHash.toLowerCase()) {
        // Hash não confere, remover arquivo corrompido
        await fs.unlink(cachedPath);
        return null;
      }
    }

    return cachedPath;
  } catch (error) {
    return null;
  }
}

/**
 * Adiciona arquivo ao cache
 */
export async function cacheFile(sourcePath: string, fileName: string): Promise<string> {
  const cacheDir = getDriversCacheDir();
  await fs.mkdir(cacheDir, { recursive: true });

  const cachedPath = path.join(cacheDir, fileName);
  await fs.copyFile(sourcePath, cachedPath);

  return cachedPath;
}

/**
 * Limpa cache antigo (mantém apenas os últimos N dias)
 */
export async function cleanOldCache(daysToKeep: number = 30): Promise<void> {
  const cacheDir = getDriversCacheDir();
  try {
    const files = await fs.readdir(cacheDir);
    const now = Date.now();
    const maxAge = daysToKeep * 24 * 60 * 60 * 1000;

    for (const file of files) {
      const filePath = path.join(cacheDir, file);
      try {
        const stats = await fs.stat(filePath);
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          console.log(`Arquivo antigo removido do cache: ${file}`);
        }
      } catch (error) {
        // Ignorar erros ao limpar arquivos individuais
      }
    }
  } catch (error) {
    // Se o diretório não existir, não há problema
  }
}

