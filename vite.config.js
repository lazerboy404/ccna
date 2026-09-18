import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

let sha = 'dev'
try { sha = execSync('git rev-parse --short HEAD').toString().trim() } catch (e) { /* sin git */ }

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: { __BUILD_SHA__: JSON.stringify(sha) },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
  },
  server: {
    port: 5173,
  },
})
