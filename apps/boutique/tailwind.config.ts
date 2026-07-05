import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "hive-gold": "#C59A5B",
        "hive-amber": "#B88A44",
        "hive-dark": "#23201D",
        "hive-cream": "#FAF7F2",
        "hive-white": "#FFFFFF",
        "hive-text": "#23201D",
        "hive-text-muted": "#7E766C",
        "hive-border": "#EAE5DB",
        "hive-comb": "#FFF3CC",
        brand: {
          50:  "#fcf6f0",
          100: "#f7ebd9",
          200: "#eed2b1",
          300: "#e0b17e",
          400: "#d08a4e",
          500: "#c06b2f",
          600: "#b15324",
          700: "#933f1f",
          800: "#76331e",
          900: "#5f2c1c",
          950: "#34150d",
        },
        neutral: {
          950: "#23201D",
        }
      },
      fontFamily: {
        serif: ["Satoshi", "sans-serif"],
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
        inter: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
