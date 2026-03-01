/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        ink: "#02062A",
        teal: "#22C0FF",
        sand: "#9FD8FF",
        peach: "#B39CFF",
        mist: "#E5EEFF",
        brand: {
          900: "#02062A",
          700: "#163D8A",
          400: "#22C0FF",
          300: "#74D8FF",
          100: "#E5EEFF",
        },
      },
    },
  },
  plugins: [],
};
