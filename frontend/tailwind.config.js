/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#f8fafc",
        brand: {
          crimson: "#b93c32",
          crimsonHover: "#9b3028",
          teal: "#0f766e",
          indigo: "#4f46e5",
          amber: "#d97706",
        },
        zone: {
          hypo: "#ef4444",
          target: "#16a34a",
          hyper: "#ea580c",
          extreme: "#b91c1c",
        }
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
