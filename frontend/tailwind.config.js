/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          dark: '#0f391f',
          light: '#e8f7ee'
        },
        kisan: {
          cream: '#fefce8',
          sand: '#fef3c7',
          earth: '#92400e',
          soil: '#78350f',
          accent: '#ea580c'
        },
        risk: {
          low: '#10b981',
          moderate: '#f59e0b',
          high: '#f97316',
          critical: '#ef4444'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        indic: ['"Hind"', '"Plus Jakarta Sans"', 'sans-serif']
      },
      boxShadow: {
        'kisan-sm': '0 1px 3px rgba(22, 101, 52, 0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'kisan-md': '0 4px 12px rgba(22, 101, 52, 0.08), 0 2px 4px rgba(0,0,0,0.03)',
        'kisan-lg': '0 10px 25px -3px rgba(22, 101, 52, 0.12), 0 4px 6px -2px rgba(0,0,0,0.05)',
        'kisan-glow': '0 0 20px rgba(34, 197, 94, 0.25)'
      }
    },
  },
  plugins: [],
}
