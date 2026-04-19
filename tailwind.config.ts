import type { Config } from "tailwindcss";

const config: Config = {
  content:  ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          blue:      "#1756a9",
          "blue-dk": "#0f3f84",
          "blue-lt": "#e8f1fc",
          cyan:      "#00c3e3",
          "cyan-dk": "#0097b2",
          "cyan-lt": "#e0f8fd",
          mid:       "#0891c4",
        },
        pool: {
          50:  "#e8f1fc",
          100: "#c5daf7",
          200: "#9bbfee",
          300: "#629fe3",
          400: "#3181d4",
          500: "#1756a9",
          600: "#124289",
          700: "#0f3f84",
          800: "#0a2d61",
          900: "#061c3e",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
      borderRadius: { "4xl": "2rem" },
    },
  },
  plugins: [],
};

export default config;
