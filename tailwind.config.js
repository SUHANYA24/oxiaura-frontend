/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0A0A0A',
          800: '#262626',
          600: '#525252',
          400: '#A3A3A3',
          300: '#D4D4D4',
          200: '#E5E5E5',
          100: '#F5F5F5',
          50: '#FAFAFA',
        },
        state: {
          // Semantic accents — the only colour permitted in the system.
          // `-bg` is the accent at ~8% over white, `-border` at ~25%.
          //
          // Every accent clears 4.5:1 against its own `-bg` tint, against white
          // and against ink.50, because a badge sits on all three. Measured:
          //   danger 5.36 / 6.05 / 5.79   warn 4.79 / 5.30 / 5.08
          //   ok     5.64 / 6.33 / 6.06   info 6.22 / 7.00 / 6.71
          // Re-measure before changing any of these six values.
          danger: '#B4342F',
          'danger-bg': '#F9EFEE',
          'danger-border': '#ECCCCB',
          // Was #9A6B12, which came to 4.23:1 on warn-bg — the one accent in the
          // system that failed. Darkened just far enough to clear 4.5:1 on the
          // tint; the hue is unchanged, so a warn badge still reads as the same
          // ochre it always did.
          warn: '#8F6311',
          'warn-bg': '#F7F3EC',
          'warn-border': '#E6DAC4',
          ok: '#2F6B48',
          'ok-bg': '#EEF3F0',
          'ok-border': '#CBDAD1',
          info: '#2B5C8A',
          'info-bg': '#EEF2F6',
          'info-border': '#CAD6E2',
        },
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        body: ['"Schibsted Grotesk"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        // Scale from Section 2 — sizes are named by role, not by t-shirt size.
        meta: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.08em' }], // 11px mono label
        body: ['0.875rem', { lineHeight: '1.5rem' }], // 14px
        section: ['0.9375rem', { lineHeight: '1.375rem' }], // 15px semibold heading
        title: ['1.75rem', { lineHeight: '2.125rem' }], // 28px display page title
        stat: ['2.25rem', { lineHeight: '2.5rem' }], // 36px display figure
        'stat-lg': ['2.5rem', { lineHeight: '2.75rem' }], // 40px display figure
      },
      borderRadius: {
        card: '12px',
        control: '8px',
      },
      boxShadow: {
        // Only for genuinely floating layers: modals, dropdowns, toasts.
        float: '0 4px 16px rgba(10, 10, 10, 0.06)',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
      keyframes: {
        'page-enter': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'page-enter': 'page-enter 150ms ease-out',
      },
    },
  },
  plugins: [],
}
