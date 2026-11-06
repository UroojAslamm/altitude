/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 700: '#2A2420', 800: '#1E1A17', 900: '#14110F', 950: '#0B0908' },
        cream: { 50: '#FBF7EF', 100: '#F3EBDD', 300: '#CDBFA6' },
        oak: { 400: '#C99A5B', 600: '#A67840' },
        glow: { 300: '#FFD58A', 500: '#F5B14A' },
        brass: { 700: '#9A6B24' },
        navy: { 500: '#3A4BB0', 700: '#2E3C93' },
        maroon: { 700: '#6B1B26' },
        berry: { 500: '#E04B55' },
        mango: { 400: '#F4B63F' },
        leaf: { 500: '#5E9B45' },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        e1: 'inset 0 1px 0 rgba(255,255,255,.14), 0 6px 14px -8px rgba(0,0,0,.7)',
        e2: 'inset 0 1px 0 rgba(255,255,255,.18), 0 14px 30px -14px rgba(0,0,0,.75)',
        e3: 'inset 0 1px 0 rgba(255,255,255,.22), 0 28px 56px -24px rgba(0,0,0,.85)',
        halo: '0 0 36px rgba(255,213,138,.45)',
      },
    },
  },
  plugins: [],
};
