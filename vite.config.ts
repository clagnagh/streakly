import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { dark, light } from './src/theme/themes.ts';

/** Puts the theme colours into index.html, so they come from the tokens too. */
function themeColorMeta(): Plugin {
  return {
    name: 'streakly-theme-color',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: {
          name: 'theme-color',
          content: light.color.background,
          media: '(prefers-color-scheme: light)',
        },
        injectTo: 'head',
      },
      {
        tag: 'meta',
        attrs: {
          name: 'theme-color',
          content: dark.color.background,
          media: '(prefers-color-scheme: dark)',
        },
        injectTo: 'head',
      },
    ],
  };
}

// The live site is served from https://clagnagh.github.io/streakly/, so every
// asset path must start with /streakly/. Change this when we move to a custom
// domain (Milestone 9).
export default defineConfig({
  base: '/streakly/',
  plugins: [
    react(),
    themeColorMeta(),
    VitePWA({
      // We write our own service worker (src/sw.ts); the plugin adds the file list.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // New versions wait for the "Refresh" banner (UpdateBanner.tsx).
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Streakly',
        short_name: 'Streakly',
        description: 'A calm habit tracker that works offline.',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: light.color.background,
        theme_color: light.color.background,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        // Everything the app needs offline, including SQLite's .wasm and the font.
        // (The manifest, its icons and `includeAssets` are added by the plugin.)
        globPatterns: ['**/*.{js,css,html,wasm,woff2}'],
        // Two SQLite helper files we never load.
        globIgnores: ['**/sqlite3-worker1-*.js', '**/sqlite3-opfs-async-proxy-*.js'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  server: { port: 5173 },
  preview: { port: 4173 },
  // SQLite WASM finds its .wasm file next to its own script; Vite's
  // pre-bundling would move the script and break that, so leave it alone.
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  // The database worker (src/db/worker.ts) uses `import`, so build it as a module.
  worker: { format: 'es' },
});
