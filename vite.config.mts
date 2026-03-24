import autoprefixer from 'autoprefixer';
import * as yaml from 'js-yaml';
import { defineConfig } from 'vite';
import foundryvtt from 'vite-plugin-foundryvtt';
import { viteStaticCopy } from 'vite-plugin-static-copy';

import MANIFEST from './src/system.json';

export default defineConfig({
  base: '/systems/swade/',
  server: {
    port: 30001,
    open: '/',
    proxy: {
      '^(?!/systems/swade/)': 'http://localhost:30000/',
      '/socket.io': {
        target: 'ws://localhost:30000',
        ws: true,
      },
    },
  },
  build: {
    emptyOutDir: false,
    minify: false,
    sourcemap: true,
    target: ['esnext'],
    lib: {
      name: 'swade',
      entry: 'src/swade.js',
      formats: ['es'],
      fileName: 'swade',
    },
  },
  esbuild: { keepNames: true },
  css: { devSourcemap: true, postcss: { plugins: [autoprefixer()] } },
  plugins: [
    {
      name: 'css-layers',
      apply: 'serve',
      transform(code, id) {
        if (id.endsWith('swade.scss')) return `\n\n@layer system {\n\n${code}\n\n}\n`;
      },
    },
    viteStaticCopy({
      watch: { options: { useFsEvents: true } },
      targets: [
        {
          //Convert the language files
          src: './src/lang/*.yml',
          dest: '/lang',
          transform: (content, filename) => {
            const data = yaml.load(content, { filename });
            return JSON.stringify(data);
          },
          rename: (name) => `../../${name}.json`,
        },
        {
          //Convert the tour files
          src: './src/tours/*.yml',
          dest: '/tours',
          transform: (content, filename) => {
            const data = yaml.load(content, { filename });
            return JSON.stringify(data);
          },
          rename: (name) => `../../${name}.json`,
        },
      ],
    }),
    foundryvtt(MANIFEST, { buildPacks: false }),
  ],
});
