import copy from '@guanghechen/rollup-plugin-copy';
import typescript from '@rollup/plugin-typescript';
import autoprefixer from 'autoprefixer';
import * as yaml from 'js-yaml';
import { defineConfig } from 'rollup';
import postcss from 'rollup-plugin-postcss';

const name = 'swade';
const distDirectory = 'dist';
const srcDirectory = 'src';

const staticFiles = [
  'fonts',
  'assets',
  'templates',
  'cards',
  'media',
  'system.json',
];

const isProd = process.env.NODE_ENV === 'production';
// const isDev = !isProd;

const banner = `/**
* Author: FloRad
* Content License: All Rights Reserved Pinnacle Entertainment, Inc
* Software License: Apache License, Version 2.0
*/`;

/**
 * this simple plugin displays which environment we're in when rollup starts
 * @param {string} environment - the environment to display
 */
const environment = (environment) => {
  /** @type {import('rollup').PluginContext} */
  const plugin = {
    name: 'environment',
    buildStart() {
      console.log('\x1b[32m%s%s\x1b[0m', 'Environment: ', environment);
    },
  };
  return plugin;
};

export default defineConfig({
  strictDeprecations: true,
  input: { [`${name}`]: `${srcDirectory}/${name}.ts` },
  output: {
    dir: distDirectory,
    format: 'es',
    sourcemap: true,
    assetFileNames: '[name].[ext]',
    banner: banner,
  },
  plugins: [
    environment(process.env.NODE_ENV),
    //TODO revisit this
    typescript({ noEmitOnError: false, noCheck: true }),
    postcss({
      extract: true,
      minimize: isProd,
      sourceMap: true,
      use: ['sass'],
      plugins: [autoprefixer()],
    }),
    copy({
      targets: [
        {
          src: staticFiles.map((f) => `${srcDirectory}/${f}`),
          dest: distDirectory,
        },
        {
          //Convert the language files
          src: [`${srcDirectory}/lang/*.yml`],
          dest: `${distDirectory}/lang`,
          transform: (content, srcPath, _dstPath) => {
            const data = yaml.load(content.toString(), { filename: srcPath });
            return JSON.stringify(data, null, 2);
          },
          rename: (name, _ext, _srcPath) => `${name}.json`,
        },
        {
          //Convert the tour files
          src: [`${srcDirectory}/tours/*.yml`],
          dest: `${distDirectory}/tours`,
          transform: (content, srcPath, _dstPath) => {
            const data = yaml.load(content.toString(), { filename: srcPath });
            return JSON.stringify(data, null, 2);
          },
          rename: (name, _ext, _srcPath) => `${name}.json`,
        },
      ],
    }),
    // isDev && livereload({
    //   watch: distDirectory,
    //   exts: ['js'],
    //   extraExts: []
    // }),
  ],
});
