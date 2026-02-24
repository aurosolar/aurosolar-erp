import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Paleta Auro Solar
      colors: {
        auro: {
          orange: '#F5820A',
          'orange-dark': '#D4700A',
          'orange-light': '#FFF5EB',
          navy: '#1A2E4A',
          'navy-mid': '#243B5C',
          'navy-dark': '#0F1C2E',
          bg: '#F2F5F9',
          surface: '#FFFFFF',
          'surface-2': '#F0F3F8',
          'surface-3': '#E5EAF2',
          border: '#E0E5ED',
        },
        estado: {
          green: '#16A34A',
          'green-bg': '#F0FFF4',
          red: '#DC2626',
          'red-bg': '#FFF5F5',
          amber: '#D97706',
          'amber-bg': '#FFFBEB',
          blue: '#2563EB',
          'blue-bg': '#EFF6FF',
          purple: '#7C3AED',
          'purple-bg': '#F5F3FF',
        },
      },
      fontFamily: {
        outfit: ['Outfit', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'card': '14px',
        'input': '8px',
        'badge': '20px',
        'button': '10px',
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
