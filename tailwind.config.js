/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f9efff',
          100: '#f1dbff',
          500: '#993bf6',
          600: '#8525eb',
          700: '#711dd8',
          900: '#3b1e5f',
        },
      },
    },
  },
  plugins: [],
}
