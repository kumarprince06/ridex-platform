import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
  // MapLibre 6 loads its worker from a file next to its own module. Pre-bundling moves the module
  // into .vite/deps without the worker, the worker 404s and every map draws blank.
  optimizeDeps: { exclude: ['maplibre-gl'] },
});
