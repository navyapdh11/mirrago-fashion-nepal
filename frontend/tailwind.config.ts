import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        nepal: {
          red: "#DC143C",
          blue: "#003893",
          crimson: "#C41E3A",
          darkblue: "#002868",
        },
      },
    },
  },
  plugins: [],
};

export default config;
