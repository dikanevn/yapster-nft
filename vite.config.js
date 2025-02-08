import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';
import polyfillNode from 'rollup-plugin-polyfill-node';

export default defineConfig({
  base: '/yapster-nft/',
  plugins: [
    react()
  ],
  define: {
    'process.env': {},
    global: 'globalThis'
  },
  resolve: {
    alias: {
      // Алиас для модуля buffer, который понадобится для Anchor
      buffer: 'buffer/'
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          process: true,
          buffer: false,
        }),
        NodeModulesPolyfillPlugin()
      ]
    }
  },
  build: {
    rollupOptions: {
      plugins: [
        polyfillNode()
      ]
    }
  }
}); 