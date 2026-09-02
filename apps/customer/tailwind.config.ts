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
        // Hover-darken shade for hive-amber buttons — previously hand-rolled as two different
        // hexes (#B45309, #d07b0a) across four files with no shared token.
        "hive-amber-dark": "#D07B0A",
        "hive-dark": "#1A1200",
        "hive-cream": "#FFFDF5",
        // Deeper warm-ivory surface tone, distinct from hive-cream — was duplicated as a raw hex
        // across two files.
        "hive-cream-deep": "#FCF8F2",
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
        serif: ["var(--font-satoshi)", "sans-serif"],
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        // Used across ~13 files under the assumption Tailwind v4's 2xs shadow step exists in
        // this v3 build — it didn't, so those usages rendered no shadow at all. Same value v4 ships.
        "2xs": "0 1px 1px 0 rgb(0 0 0 / 0.04)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
