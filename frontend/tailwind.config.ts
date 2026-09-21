import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Ledger-inspired palette: deep navy for structure, one clean green
        // accent for primary actions, and semantic status colors that map
        // 1:1 onto invoice/transaction states — not decoration, information.
        ink: {
          950: '#0F172A',
          900: '#111C34',
          800: '#1C2A47',
        },
        paper: '#F7F6F2',
        accent: {
          DEFAULT: '#0E9F6E',
          dark: '#0B7A55',
        },
        status: {
          paid: '#0E9F6E',
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