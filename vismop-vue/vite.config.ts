import { defineConfig } from 'vite';
import { quasar, transformAssetUrls } from '@quasar/vite-plugin';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  build: {
    outDir: '../dist',
    sourcemap: true,
  },
  plugins: [
    glsl(),
    vue({
      template: {
        transformAssetUrls,
      },
    }),
    quasar({
      sassVariables: 'src/css/quasar-variables.sass',
    }),
  ],
  resolve: {
    extensions: [
      '.mjs',
      '.js',
      '.ts',
      '.jsx',
      '.tsx',
      '.json',
      '.vue',
      '.glsl',
    ],
    alias: {
      //vue: '@vue/compat',
      '@': path.resolve(__dirname, './src'),
    },
  },
});
