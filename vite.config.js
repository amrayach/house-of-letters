import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  plugins: [glsl()],
  publicDir: 'public', // Serves static assets from /public
  server: {
    open: true,
    fs: {
      // Allow serving files from assets directory
      allow: ['..']
    }
  },
  build: {
    outDir: 'dist'
  },
  // Ensure assets folder is accessible
  assetsInclude: ['**/*.glb']
});
