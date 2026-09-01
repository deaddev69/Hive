/** @type {import('tailwindcss').Config} */
module.exports = {
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
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "2xs": "0 1px 1px 0 rgb(0 0 0 / 0.04)",
      },
    },
  },
};
