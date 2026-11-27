/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        wa: '#25D366',
        'wa-dark': '#1da851',
        promo: '#FF6B00',
        ink: '#1a1a1a',
        arav: {
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
        },
      },
    },
  },
  plugins: [],
};