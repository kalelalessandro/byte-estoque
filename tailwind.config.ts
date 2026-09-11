import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#22d3ee", dark: "#06b6d4", blue: "#3b82f6" },
      },
    },
  },
  plugins: [],
} satisfies Config;
