/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./main.jsx",
    "./App.jsx",
    "./src/**/*.css",
  ],
  theme: {
    extend: {
      animation: {
        'in': 'fadeIn 0.5s ease-in',
        'fade-in': 'fadeIn 0.5s ease-in',
        'slide-in-from-right': 'slideInFromRight 0.3s ease-out',
        'slide-in-from-top-4': 'slideInFromTop 0.4s ease-out',
        'slide-in-from-bottom-4': 'slideInFromBottom 0.5s ease-out',
        'zoom-in-95': 'zoomIn 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInFromRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInFromTop: {
          '0%': { transform: 'translateY(-1rem)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInFromBottom: {
          '0%': { transform: 'translateY(1rem)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        zoomIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
