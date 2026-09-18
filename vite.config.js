import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

// Hash del build: usa la variable de Vercel si existe; si no, intenta git con timeout corto.
function buildSha() {
  const env = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA
  if (env) return String(env).slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 }).toString().trim()
  } catch (e) { return 'dev' }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: { __BUILD_SHA__: JSON.stringify(buildSha()) },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
  },
  server: {
    port: 5173,
  },
})
