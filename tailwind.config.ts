import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", "[data-theme='dark']"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
      colors: {
        hanan: {
          50: "#edf8f1",
          100: "#d5efdf",
          200: "#acdcbf",
          300: "#78c398",
          400: "#47a36f",
          500: "#2d8757",
          600: "#216b45",
          700: "#1d563a",
          800: "#194530",
          900: "#153a29"
        }
      },
      boxShadow: {
        panel: "0 10px 28px rgba(25, 69, 48, 0.08)"
      }
    }
  },
  plugins: [],
};

export default config;
