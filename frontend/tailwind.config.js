/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        kinetic: {
          red: '#D62828',
          orange: '#F77F00',
          gold: '#FCBF49',
          teal: '#2A9D8F',
          navy: '#1B263B',
          cream: '#FFF9EB',
          parchment: '#FFF3D4',
          duct: '#C4C4C4',
          mud: '#6B4423',
        },
      },
      fontFamily: {
        display: ['"Bangers"', 'cursive'],
        body: ['"Nunito"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        kinetic: '0 4px 0 0 #1B263B',
        'kinetic-sm': '0 2px 0 0 #1B263B',
        'kinetic-gold': '0 4px 0 0 #B8860B',
      },
      backgroundImage: {
        'kinetic-stripes':
          'repeating-linear-gradient(105deg, #D62828 0 14px, #FCBF49 14px 28px, #2A9D8F 28px 42px, #1B263B 42px 56px)',
        'kinetic-dots':
          'radial-gradient(circle at 1px 1px, rgba(252,191,73,0.15) 1px, transparent 0)',
      },
      backgroundSize: {
        dots: '24px 24px',
      },
    },
  },
  plugins: [],
}
