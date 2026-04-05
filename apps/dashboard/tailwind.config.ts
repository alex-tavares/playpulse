import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      borderRadius: {
        lg: '1.25rem',
        xl: '1.75rem',
      },
      boxShadow: {
        card: '0 24px 60px rgba(15, 23, 42, 0.08)',
      },
      colors: {
        canvas: '#f7f3e9',
        ink: '#132a1f',
        mist: '#eef4ee',
        moss: '#4d7c5e',
        pine: '#1f4b36',
        sand: '#ead8bb',
        signal: '#c86532',
      },
      fontFamily: {
        body: ['"IBM Plex Sans"', '"Segoe UI"', 'sans-serif'],
        display: ['"Avenir Next"', '"Trebuchet MS"', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
