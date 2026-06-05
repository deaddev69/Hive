export const HIVE_THEME = {
  colors: {
    gold: "#F5A623",
    amber: "#E8890C",
    dark: "#1A1200",
    cream: "#FFFDF5",
    white: "#FFFFFF",
    text: "#2C1E00",
    textMuted: "#8C7A5A",
    border: "#F0E4C8",
    comb: "#FFF3CC",
  },
  fonts: {
    display: "Playfair Display, Georgia, serif",
    sans: "Inter, system-ui, sans-serif",
  },
} as const;

export type HiveTheme = typeof HIVE_THEME;
export type HiveColor = keyof HiveTheme["colors"];
export type HiveFont = keyof HiveTheme["fonts"];
