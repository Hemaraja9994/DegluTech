/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'IBM Plex Sans', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
        mono: ['IBM Plex Mono', 'JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        clinical: {
          bg: '#eef5f7',
          surface: '#ffffff',
          mist: '#f7fafc',
          line: '#d7e3ea',
          ink: '#10202f',
          muted: '#425466',
          teal: '#0f766e',
          cyan: '#0f8ea8',
          blue: '#2563eb',
          danger: '#b42318',
          caution: '#b7791f',
        },
      },
      borderRadius: {
        clinical: '10px',
        ticket: '14px',
      },
      boxShadow: {
        clinical: '0 12px 34px rgba(16, 32, 47, 0.08)',
        'clinical-lift': '0 16px 42px rgba(16, 32, 47, 0.12)',
      },
    },
  },
  plugins: [],
};
