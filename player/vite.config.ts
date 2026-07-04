import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'OmPlayer',
      formats: ['es', 'iife'],
      fileName: (format) => (format === 'iife' ? 'om-player.iife.js' : 'om-player.es.js'),
    },
    rollupOptions: {
      output: {
        assetFileNames: 'om-player.[ext]',
      },
    },
    cssCodeSplit: false,
    minify: true,
  },
});
