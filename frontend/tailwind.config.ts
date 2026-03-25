import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Brand ──────────────────────────────────────────────────────────
        primary: {
          DEFAULT: '#006B84',
          hover:   '#00566A',
          dark:    '#004A5C',
          10:      '#E6F0F2',
          30:      '#B3DCE5',
        },
        accent: {
          DEFAULT: '#4A154B',
          hover:   '#6B2D6C',
          dark:    '#361037',
          10:      '#F3E8F3',
          30:      '#D4A0D5',
        },
        navy: '#1B1D37',
        secondary: '#844981',

        // ── Semánticos ─────────────────────────────────────────────────────
        success: {
          DEFAULT: '#2EB67D',
          10:      '#E9F7F0',
          30:      '#A3DFC4',
          text:    '#1A6B47',
        },
        danger: {
          DEFAULT: '#E01E5A',
          hover:   '#B8163F',
          10:      '#FCEAEF',
          30:      '#F4A0B8',
          text:    '#9C1440',
        },
        warning: {
          DEFAULT: '#ECB22E',
          10:      '#FDF5E0',
          30:      '#F5D67A',
          text:    '#7A5A0F',
        },
        info: {
          DEFAULT: '#36C5F0',
          10:      '#E8F7FC',
          30:      '#A8E2F7',
          text:    '#1A6E8A',
        },

        // ── Semáforo SLA ───────────────────────────────────────────────────
        sla: {
          ok:           '#44B847',
          'ok-10':      '#EAF6EA',
          'ok-30':      '#B3DDB4',
          'ok-text':    '#2A6E2C',
          risk:         '#F5A623',
          'risk-10':    '#FEF3E0',
          'risk-30':    '#FBD580',
          'risk-text':  '#8A5A0C',
          breach:       '#D0021B',
          'breach-10':  '#FCE4E6',
          'breach-30':  '#F4A0A7',
          'breach-text':'#8A0112',
        },

        // ── Superficies ────────────────────────────────────────────────────
        surface: {
          DEFAULT: '#FFFFFF',
          muted:   '#F2F1F0',
          subtle:  '#E6E5E3',
          border:  '#D0CFCC',
        },

        // ── Texto ──────────────────────────────────────────────────────────
        text: {
          primary:   '#1B1D37',
          secondary: '#6B6E80',
          disabled:  '#9B9DAB',
          inverse:   '#FFFFFF',
        },
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },

      fontSize: {
        xs:    ['0.75rem',  { lineHeight: '1rem' }],
        sm:    ['0.875rem', { lineHeight: '1.25rem' }],
        base:  ['1rem',     { lineHeight: '1.5rem' }],
        lg:    ['1.125rem', { lineHeight: '1.75rem' }],
        xl:    ['1.25rem',  { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem',   { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      },

      borderRadius: {
        sm:   '0.25rem',
        md:   '0.375rem',
        lg:   '0.5rem',
        xl:   '0.75rem',
        full: '9999px',
      },

      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [],
} satisfies Config
