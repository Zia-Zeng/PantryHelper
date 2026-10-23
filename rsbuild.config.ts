import { fileURLToPath } from 'node:url';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  // Keep mode and SWC development enabled: npm run build emits a static preview
  // with jsxDEV source positions on React 18 Fiber for Canvas visual editing.
  // Preserve these settings when adjusting the build; HMR and Fast Refresh stay off.
  mode: 'development',
  plugins: [pluginReact({ fastRefresh: false, swcReactOptions: { development: true, refresh: false } })],
  dev: {
    hmr: false,
  },
  source: {
    define: {
      __INSPIRE_SOURCE_ROOT__: JSON.stringify(fileURLToPath(new URL('.', import.meta.url))),
    },
    entry: {
      preview: './src/index.tsx',
    },
  },
  html: {
    template: './index.html',
  },
  output: {
    distPath: {
      root: 'dist',
      js: '',
    },
    filename: {
      html: 'index.html',
      js: 'preview.js',
    },
    filenameHash: false,
    injectStyles: true,
    dataUriLimit: Number.MAX_SAFE_INTEGER,
    legalComments: 'inline',
    manifest: true,
    cleanDistPath: true,
    sourceMap: false,
    minify: false,
  },
  performance: {
    chunkSplit: {
      strategy: 'all-in-one',
    },
  },
  tools: {
    rspack(config) {
      config.output = {
        ...config.output,
        asyncChunks: false,
      };
    },
  },
});
