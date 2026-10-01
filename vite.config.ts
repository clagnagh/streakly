import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The live site is served from https://clagnagh.github.io/streakly/, so every
// asset path must start with /streakly/. Change this when we move to a custom
// domain (Milestone 9).
export default defineConfig({
  base: '/streakly/',
  plugins: [react()],
  server: { port: 5173 },
  preview: { port: 4173 },
  // SQLite WASM finds its .wasm file next to its own script; Vite's
  // pre-bundling would move the script and break that, so leave it alone.
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  // The database worker (src/db/worker.ts) uses `import`, so build it as a module.
  worker: { format: 'es' },
});
