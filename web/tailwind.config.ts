import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0f',
        foreground: '#f5f5f5',
        muted: '#a1a1aa',
        primary: {
          DEFAULT: '#6366f1',
          hover: '#818cf8',
        },
        secondary: {
          DEFAULT: '#8b5cf6',
          hover: '#a78bfa',
        },
        accent: '#22d3ee',
        card: {
          DEFAULT: '#12121a',
          hover: '#1a1a2e',
        },
        border: '#1e1e2e',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        'gradient-primary-hover': 'linear-gradient(135deg, #818cf8, #a78bfa)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
