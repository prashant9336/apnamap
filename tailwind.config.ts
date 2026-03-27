import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        accent:   "#FF5E1A",
        "accent-l": "#FF7A40",
        green:    "#1FBB5A",
        gold:     "#E8A800",
        bg:       "#05070C",
        surface:  "rgba(255,255,255,0.034)",
      },
      fontFamily: {
        syne:    ["Syne", "sans-serif"],
        dm:      ["DM Sans", "sans-serif"],
        mono:    ["DM Mono", "monospace"],
      },
      animation: {
        "gps-pulse": "gpspulse 2s infinite",
        "fade-up":   "fadeup 0.4s ease forwards",
        "shimmer":   "shimmer 2.5s ease-in-out infinite",
      },
      keyframes: {
        gpspulse: {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(31,187,90,0.6)" },
          "50%":     { boxShadow: "0 0 0 8px rgba(31,187,90,0)" },
        },
        fadeup: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
