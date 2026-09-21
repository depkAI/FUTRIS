/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#08060d',
          900: '#0b0911',
          800: '#120f1a',
          700: '#1a1426',
          600: '#241c33',
        },
        gold: {
          300: '#f3dfae',
          400: '#e8c882',
          500: '#d9b36a',
          600: '#c39a4a',
        },
        mist: {
          300: '#d8cfe8',
          400: '#bfb3d8',
          500: '#9d8dc0',
        },
      },
      fontFamily: {
        display: ['var(--font-cinzel)', 'serif'],
        sans: ['var(--font-poppins)', 'sans-serif'],
      },
      letterSpacing: {
        widest2: '0.28em',
      },
      boxShadow: {
        glow: '0 0 40px rgba(217, 179, 106, 0.18)',
        'glow-bright': '0 0 60px rgba(217, 179, 106, 0.35)',
      },
    },
  },
  plugins: [],
}