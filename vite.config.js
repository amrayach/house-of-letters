import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
import { resolve, join } from 'path';
import { existsSync } from 'fs';

/**
 * Dev-only: serve public/<dir>/index.html for bare directory URLs (/about/, /listen/?p=3).
 * Vite's dev server has no directory-index resolution for publicDir, so without this the
 * SPA html fallback serves the landing page instead. Production (Cloudflare Pages) and
 * `vite preview` resolve these natively — this plugin must never affect the build.
 */
function publicDirIndexes() {
  const publicRoot = resolve(__dirname, 'public');
  return {
    name: 'public-dir-indexes',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        const url = new URL(req.url, 'http://localhost');
        const pathname = decodeURIComponent(url.pathname);
        if (pathname === '/' || pathname.includes('..')) return next();
        if (!existsSync(join(publicRoot, pathname, 'index.html'))) return next();
        if (pathname.endsWith('/')) {
          // Let Vite's publicDir middleware serve the real file (runs before the SPA fallback).
          req.url = pathname + 'index.html' + url.search;
          return next();
        }
        // Match production: Cloudflare Pages redirects /about -> /about/.
        res.statusCode = 301;
        res.setHeader('Location', pathname + '/' + url.search);
        res.end();
      });
    },
  };
}

export default defineConfig({
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console'] : [],
  },
  plugins: [glsl(), publicDirIndexes()],
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
