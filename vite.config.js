import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
import { resolve } from 'path';

export default defineConfig({
  plugins: [glsl()],
  publicDir: 'public',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@audio': resolve(__dirname, 'src/audio'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@data': resolve(__dirname, 'src/data'),
      '@config': resolve(__dirname, 'src/config'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@interaction': resolve(__dirname, 'src/interaction')
    }
  },
  server: {
    open: true,
    fs: {
      allow: ['.']
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three']
        }
      }
    }
  },
  assetsInclude: ['**/*.glb']
});
