export const HIVE_THEME = {
  colors: {
    gold: "#d4af37",
    amber: "#E8890C",
    amberDark: "#D07B0A",
    dark: "#1A1200",
    cream: "#FFFDF5",
    creamDeep: "#FCF8F2",
    white: "#FFFFFF",
    text: "#2C1E00",
    textMuted: "#8C7A5A",
    border: "#F0E4C8",
    comb: "#FFF3CC",
  },
  fonts: {
    display: "Instrument Serif, Georgia, serif",
    sans: "Inter, system-ui, sans-serif",
  },
} as const;

export type HiveTheme = typeof HIVE_THEME;
export type HiveColor = keyof HiveTheme["colors"];
export type HiveFont = keyof HiveTheme["fonts"];
