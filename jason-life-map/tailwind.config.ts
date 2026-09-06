import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FFFFFF",
        surface: "#F6F7F9",
        line: "#E6E8EC",
        ink: "#1C2230",
        muted: "#6B7280",
        navy: {
          DEFAULT: "#0F2140",
          light: "#1B3560",
          soft: "#EEF1F6",
        },
        brass: {
          DEFAULT: "#B08A55",
          soft: "#F3EAD9",
        },
      },
      fontFamily: {
        serif: ["'Noto Serif TC'", "serif"],
        sans: ["'Noto Sans TC'", "sans-serif"],
      },
      borderRadius: {
        card: "14px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 33, 64, 0.06), 0 1px 1px rgba(15, 33, 64, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
