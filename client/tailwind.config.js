/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--pp-ink-rgb) / <alpha-value>)",
        teal: "rgb(var(--pp-teal-rgb) / <alpha-value>)",
        sand: "rgb(var(--pp-sand-rgb) / <alpha-value>)",
        peach: "rgb(var(--pp-peach-rgb) / <alpha-value>)",
        mist: "rgb(var(--pp-mist-rgb) / <alpha-value>)",
        brand: {
          900: "rgb(var(--pp-brand-900-rgb) / <alpha-value>)",
          700: "rgb(var(--pp-brand-700-rgb) / <alpha-value>)",
          400: "rgb(var(--pp-brand-400-rgb) / <alpha-value>)",
          300: "rgb(var(--pp-brand-300-rgb) / <alpha-value>)",
          100: "rgb(var(--pp-brand-100-rgb) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
};
