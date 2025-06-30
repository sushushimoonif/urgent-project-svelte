/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        gray: {
          750: '#3f3f46',
          850: '#1f2937',
        },
        chart: {
          yellow: '#fbbf24',
          orange: '#f97316',
          green: '#10b981',
          blue: '#3b82f6',
          purple: '#8b5cf6',
          red: '#ef4444',
        },
        'tab-selected': '#8b5cf6',
        'tab-bg': '#4b5563',
        'label-color': '#f3f4f6',
        'input-bg': '#374151',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      minWidth: {
        '48': '12rem',
        '64': '16rem',
      },
      maxWidth: {
        '8xl': '88rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      boxShadow: {
        'inner-lg': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.1)',
        'glow': '0 0 20px rgba(139, 92, 246, 0.3)',
      },
      backdropBlur: {
        xs: '2px',
      },
      gridTemplateColumns: {
        '13': 'repeat(13, minmax(0, 1fr))',
        '14': 'repeat(14, minmax(0, 1fr))',
        '15': 'repeat(15, minmax(0, 1fr))',
        '16': 'repeat(16, minmax(0, 1fr))',
      }
    },
  },
  plugins: [],
}