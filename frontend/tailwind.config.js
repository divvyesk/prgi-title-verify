/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        beige: {
          50: '#FDFCF9',
          100: '#F8F6F0',
          200: '#F0EBE0',
          300: '#E4DAC8',
          400: '#CFC0A8',
          500: '#B5A285',
          600: '#948063',
          700: '#75634B',
          800: '#564735',
          900: '#382E22',
        },
        stone: {
          850: '#201D1A',
          950: '#141210',
        },
        gov: {
          gold: '#B45309',
          goldLight: '#D97706',
          goldPale: '#FEF3C7',
          emerald: '#047857',
          emeraldLight: '#059669',
          emeraldPale: '#D1FAE5',
          crimson: '#B91C1C',
          crimsonLight: '#DC2626',
          crimsonPale: '#FEE2E2',
          navy: '#1E293B',
          navyLight: '#334155',
          sand: '#EFE7DA',
          sandDark: '#DDD1BF',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Cormorant Garamond', 'Newsreader', 'Georgia', 'serif'],
        display: ['Syne', 'Outfit', 'Plus Jakarta Sans', 'sans-serif'],
        editorial: ['Cormorant Garamond', 'Newsreader', 'serif'],
        luxury: ['Syne', 'Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-slow': 'float 7s ease-in-out infinite',
        'float-reverse': 'floatReverse 8s ease-in-out infinite',
        'scan-line': 'scanLine 1.8s ease-in-out infinite',
        'laser-sweep': 'laserSweep 2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'shake-violent': 'shake 0.35s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite',
        'shake-gentle': 'shakeGentle 0.5s ease-in-out infinite',
        'glow-beige': 'glowBeige 2.5s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        floatReverse: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(12px)' },
        },
        scanLine: {
          '0%': { top: '0%', opacity: '0.9' },
          '50%': { top: '96%', opacity: '1' },
          '100%': { top: '0%', opacity: '0.9' },
        },
        laserSweep: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '25%': { opacity: '1' },
          '75%': { opacity: '1' },
          '100%': { transform: 'translateY(220%)', opacity: '0' },
        },
        shake: {
          '10%, 90%': { transform: 'translate3d(-2px, 0, 0) scale(1.01)' },
          '20%, 80%': { transform: 'translate3d(3px, -1px, 0) scale(1.02)' },
          '30%, 50%, 70%': { transform: 'translate3d(-3px, 2px, 0) scale(1.01)' },
          '40%, 60%': { transform: 'translate3d(3px, -2px, 0) scale(1.02)' }
        },
        shakeGentle: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '25%': { transform: 'translate(-1.5px, 1.5px)' },
          '50%': { transform: 'translate(1.5px, -1px)' },
          '75%': { transform: 'translate(-1px, -1.5px)' },
        },
        glowBeige: {
          '0%': { filter: 'drop-shadow(0 4px 12px rgba(180, 83, 9, 0.15))' },
          '100%': { filter: 'drop-shadow(0 8px 24px rgba(180, 83, 9, 0.35))' },
        }
      }
    },
  },
  plugins: [],
}
