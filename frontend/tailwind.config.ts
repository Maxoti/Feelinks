import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Palette: Circuit Navy (structure, text) + Solar Lime (one highlight per screen) on white.
        // Rule: lime is a FILL (buttons, badges, bars). Never use it as text or a border on white
        // (about 1.2:1 contrast); on navy it works as text. Navy on lime is about 15:1.
        ink: {
          950: '#0C1A2B', // Circuit Navy: sidebar, text, headings
          900: '#122238',
          800: '#1B3049', // active/hover surface inside the sidebar
        },
        paper: '#FFFFFF',
        solar: {
          DEFAULT: '#B6FF3B', // Solar Lime: primary buttons, active marker, hero figure
          dark: '#9BE21F',    // hover
          soft: '#E8FFC0',    // tinted badge background (navy text on top)
        },
        // Links, focus rings and active filter pills use `accent`, so accent is navy, not lime.
        accent: {
          DEFAULT: '#0C1A2B',
          dark: '#000000',
        },
        // Semantic status colors: information, not decoration. Kept readable on white.
        status: {
          paid: '#4D7C0F',
          partial: '#B7791F',
          unpaid: '#94A3B8',
          overdue: '#B4453A',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Inter', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;