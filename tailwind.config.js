/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sim: {
          bg: '#070d1a',
          panel: '#0d1830',
          panel2: '#0a1428',
          border: '#1d3054',
          accent: '#22d3ee',
          ok: '#22c55e',
          err: '#ef4444',
          warn: '#f59e0b',
          purple: '#a78bfa',
          muted: '#8aa2c4',
          text: '#dbe7f8',
        },
      },
      fontFamily: {
        mono: ['"Cascadia Code"', 'Consolas', '"SF Mono"', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
