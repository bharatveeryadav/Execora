/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary:     '#0f172a',
        'primary-fg': '#f8fafc',
        accent:      '#3b82f6',
        success:     '#16a34a',
        warning:     '#d97706',
        danger:      '#dc2626',
        muted:       '#94a3b8',
        border:      '#e2e8f0',
        card:        '#ffffff',
        background:  '#f8fafc',
      },
      fontFamily: {
        sans: ['Inter', 'System'],
        mono: ['JetBrainsMono', 'Courier'],
      },
    },
  },
  plugins: [],
};
