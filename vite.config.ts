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
});
