/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          dark: '#111111',
          deep: '#1A1A1A',
          card: '#202020'
        },
        brand: {
          blue: '#3A86FF',
          purple: '#8B5CF6',
          pink: '#FF4DCA',
          fuchsia: '#FF1B8D',
          orange: '#FF5A1F',
          yellow: '#FFD84D'
        }
      },
      fontFamily: {
        display: ['Montserrat', 'Poppins', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'Nunito Sans', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        glow: '0 12px 40px rgba(255, 27, 141, 0.35)',
        card: '0 24px 80px rgba(0, 0, 0, 0.28)'
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '28px'
      }
    }
  },
  plugins: []
};
