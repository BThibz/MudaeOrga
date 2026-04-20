/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        discord: {
          DEFAULT: '#5865F2',
          hover: '#4752C4',
        },
      },
    },
  },
  plugins: [],
};
