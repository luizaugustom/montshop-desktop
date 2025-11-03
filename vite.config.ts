import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    plugins: [
      react(),
      electron([
        {
          entry: 'electron/main.ts',
          vite: {
            build: {
              outDir: 'dist-electron',
              rollupOptions: {
                external: ['electron']
              }
            }
          }
        },
        {
          entry: 'electron/preload.ts',
          onstart(options) {
            options.reload();
          },
          vite: {
            build: {
              outDir: 'dist-electron',
              rollupOptions: {
                external: ['electron']
              }
            }
          }
        }
      ]),
      renderer()
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    base: './',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      // Garantir que em produção não tenha referências ao HMR
      target: 'esnext',
      minify: isProduction ? 'esbuild' : false,
    },
    server: {
      port: 5173,
      // Desabilitar HMR em produção
      hmr: !isProduction,
    },
    // Desabilitar qualquer conexão com servidor Vite em produção
    define: {
      __DEV__: !isProduction,
    },
  };
});

