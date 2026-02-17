/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cf: {
          orange: '#f6821f',
          'orange-dark': '#e06b0a',
          'orange-light': '#faa63e',
        },
      },
    },
  },
  plugins: [],
};
