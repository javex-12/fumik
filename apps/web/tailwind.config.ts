import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#020617", // Deep Slate 950
        surface: "#0F172A",    // Slate 900
        primary: "#6366F1",    // Indigo 500
        secondary: "#94A3B8",  // Slate 400
        accent: "#F43F5E",     // Rose 500
        vibrant: "#8B5CF6",    // Violet 500
        premium: "#F59E0B",    // Amber 500 (Gold)
      },
      fontFamily: {
        display: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"],
      },
      boxShadow: {
        'premium': '0 20px 50px -12px rgba(99, 102, 241, 0.2)',
        'soft-glow': '0 0 40px -10px rgba(99, 102, 241, 0.3)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'premium-gradient': 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
      },
    },
  },
  plugins: [],
};
export default config;
