/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1C2B39",
        paper: "#E9E4D8",
        ruled: "#B9AF9C",
        stamp: "#3F6B4F",
        caution: "#B8862E",
        oxide: "#A23B2E",
      },
      fontFamily: {
        serif: ["Source Serif 4", "Georgia", "serif"],
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        none: "0px",
        stamp: "999px",
      },
      keyframes: {
        "stamp-impact": {
          "0%": { transform: "scale(0.3) rotate(-3deg)", opacity: "0" },
          "60%": { transform: "scale(1.12) rotate(-3deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(-3deg)", opacity: "1" },
        },
      },
      animation: {
        "stamp-impact": "stamp-impact 100ms ease-out",
      },
    },
  },
  plugins: [],
};
