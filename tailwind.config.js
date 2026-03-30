/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // agent22 design system — mirrors agent22-web
        bg:      "#060608",
        surface: "#0d0d10",
        border:  "#1a1a22",
        accent:  "#00e5ff",
        warm:    "#ff6b35",
        purple:  "#a855f7",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body:    ["'Inter'", "sans-serif"],
      },
      letterSpacing: {
        tighter: "-0.04em",
        tight:   "-0.02em",
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "2px",
      },
    },
  },
  plugins: [],
};
