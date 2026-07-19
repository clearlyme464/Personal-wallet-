import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        surface: "var(--surface-1)",
        "page-plane": "var(--page-plane)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        muted: "var(--muted)",
        series: {
          1: "var(--series-1)",
          2: "var(--series-2)",
          3: "var(--series-3)",
          4: "var(--series-4)",
          5: "var(--series-5)",
          6: "var(--series-6)",
          7: "var(--series-7)",
          8: "var(--series-8)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
