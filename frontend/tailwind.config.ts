import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#090b0d",
        panel: "#111519",
        raised: "#171c21",
        line: "#2a3139",
        muted: "#9aa4af",
        ink: "#f1f5f7",
        signal: "#7bc9bc",
        risk: {
          low: "#7bc9bc",
          medium: "#e6b764",
          high: "#e06d6d"
        }
      },
      boxShadow: {
        panel: "0 16px 40px rgba(0, 0, 0, 0.18)"
      },
      borderRadius: {
        sm: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem"
      }
    }
  },
  plugins: []
} satisfies Config;
