import { readFileSync } from 'node:fs';

import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/**
 * MapLibre 6 starts its worker from a file beside its own module ("./maplibre-gl-worker.mjs"),
 * which a bundle does not carry. Without it every map draws blank, so the worker and the shared
 * chunk it imports are copied next to the built script.
 */
function maplibreWorker(): Plugin {
  const files = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'];
  return {
    name: 'maplibre-worker',
    apply: 'build',
    generateBundle() {
      for (const file of files) {
        this.emitFile({
          type: 'asset',
          fileName: `assets/${file}`,
          source: readFileSync(new URL(`./node_modules/maplibre-gl/dist/${file}`, import.meta.url)),
        });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), maplibreWorker()],
  server: { port: 5174 },
  // Dev serves MapLibre straight from node_modules, where the worker sits beside it; pre-bundling
  // would move the module into .vite/deps without it.
  optimizeDeps: { exclude: ['maplibre-gl'] },
});
