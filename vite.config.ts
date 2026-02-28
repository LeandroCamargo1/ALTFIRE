import { defineConfig } from 'vite';
import path from 'path';

// ============================================================
// Vite Config - Cliente FPS Multiplayer
// ============================================================
export default defineConfig({
  // Resolve alias para importar do shared
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },

  // Servidor de dev com proxy para o backend Geckos
  server: {
    port: 5173,
    // Headers necessários para SharedArrayBuffer (Rapier WASM)
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },

  // Otimizações de build para performance máxima
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: true,
  },

  // Otimizar dependências pesadas
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d'],
  },
});
