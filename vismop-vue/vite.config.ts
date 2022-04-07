import { defineConfig } from 'vite'
import vuetify from '@vuetify/vite-plugin'
import  vue  from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  build: {
    outDir:'../dist',
    sourcemap: true
  },
  plugins: [
    vue(/*{
      template: {
        compilerOptions: {
          compatConfig: {
            MODE: 3,
          }
        }
      }
    }*/),
    vuetify({
      autoImport: true,
    })
  ],
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue', '.glsl'],
    alias: {
      //vue: '@vue/compat',
      "@": path.resolve(__dirname, "./src"),
      
    },
  },
})