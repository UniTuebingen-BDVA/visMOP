import { defineConfig } from 'vite'
import  vue  from '@vitejs/plugin-vue'
import path  from 'path'

export default defineConfig({
  build: {
    outDir:'../dist',
    sourcemap: true
  },
  plugins: [vue({
    template: {
      compilerOptions: {
        compatConfig: {
          MODE: 2
        }
      }
    }
  })],
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue', '.glsl'],
    alias: {
      "@": path.resolve(__dirname, "./src"),
      vue: '@vue/compat'
    },
  },
})