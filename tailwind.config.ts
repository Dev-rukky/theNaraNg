import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        nara: {
          black: "#0F0F14",
          surface: "#16161E",
          surface2: "#1E1E28",
          border: "#2A2A38",
          amber: "#EF9F27",
          amber2: "#F9C74F",
          text: "#F5F0E8",
          muted: "#7A7585",
          green: "#1D9E75",
          red: "#D85A30",
        },
      },
      fontFamily: {
        sans: ["Geist", "sans-serif"],
        mono: ["Geist Mono", "monospace"],
      },
      animation: {
        "pulse-dot": "pulse-dot 2s infinite",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(29,158,117,0.5)" },
          "50%": { boxShadow: "0 0 0 6px rgba(29,158,117,0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;