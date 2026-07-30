/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        hive: {
          amber: "#F5C22B",
          gold: "#E0B024",
          dark: "#252323",
        },
      },
    },
  },
  plugins: [],
};
