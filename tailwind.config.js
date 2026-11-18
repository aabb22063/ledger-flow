/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      colors: {
        canvas: '#F7F7F5',
        surface: '#FFFFFF',
        ink: '#111110',
        muted: '#6B6B66',
        hairline: '#E5E5E0',
        positive: '#0D6E4E',
        negative: '#C23B2B'
      }
    }
  },
  plugins: []
};
