/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {

      /* ----------- COLORS (SaaS Palette) ----------- */
      colors: {
        primary: {
          light: "#EEF2FF",
          DEFAULT: "#4F46E5",
          dark: "#3730A3",
        },
        success: "#16A34A",
        warning: "#F59E0B",
        danger: "#DC2626",
        info: "#0284C7",
      },

      /* ----------- GLASS EFFECT ----------- */
      backdropBlur: {
        xs: "2px",
      },

      /* ----------- ANIMATIONS ----------- */
      animation: {
        fadeIn: "fadeIn 0.2s ease-in-out",
        slideDown: "slideDown 0.25s ease-out",
      },

      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(-5px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },

      /* ----------- SHADOWS (Dashboard Style) ----------- */
      boxShadow: {
        soft: "0 4px 20px rgba(0, 0, 0, 0.05)",
        dropdown: "0 10px 30px rgba(0, 0, 0, 0.08)",
      },

      /* ----------- BORDER RADIUS ----------- */
      borderRadius: {
        xl2: "1rem",
      },

    },
  },
  plugins: [],
};
