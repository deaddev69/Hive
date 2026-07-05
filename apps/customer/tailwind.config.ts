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
        "hive-gold": "#d4af37",
        "hive-amber": "#E8890C",
        "hive-dark": "#1A1200",
        "hive-cream": "#FFFDF5",
        "hive-white": "#FFFFFF",
        "hive-text": "#2C1E00",
        "hive-text-muted": "#8C7A5A",
        "hive-border": "#F0E4C8",
        "hive-comb": "#FFF3CC",
        // Sleek primary HSL brand colors
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
          950: "#0b0c10",
        }
      },
      fontFamily: {
        serif: ["Satoshi", "sans-serif"],
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
