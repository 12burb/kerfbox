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
        accent: {
          DEFAULT: "#ff1744",
          dim: "#8a0a22",
        },
        ink: "#f5f1e8",
        bg: {
          DEFAULT: "#0a0a0c",
          2: "#121215",
          3: "#1a1a1f",
        },
        muted: "#7a7a82",
        background: "var(--bg)",
        foreground: "var(--ink)",
        border: "var(--accent-dim)",
      },
      fontFamily: {
        sans: ["var(--font-hanken-grotesk)", "system-ui", "sans-serif"],
        serif: ["var(--font-fraunces)", "serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
