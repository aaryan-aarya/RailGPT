import type { Config } from 'tailwindcss';

/**
 * RailGPT design tokens.
 * A restrained "railway control-room" identity: deep rail-blue, warm paper,
 * a single marigold accent, and a dedicated signal palette for booking status.
 * Deliberately NOT a generic gradient/glass dashboard theme.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F4F5F2',
        surface: '#FFFFFF',
        ink: '#0F2438',
        body: '#3A4D61',
        muted: '#6E7E91',
        line: '#E2E6E0',
        brand: {
          DEFAULT: '#12395B',
          strong: '#0C2A45',
          soft: '#E8EFF5',
          tint: '#F2F6FA',
        },
        accent: {
          DEFAULT: '#E08A2E',
          strong: '#C9761F',
          soft: '#FBF0E1',
        },
        ok: { DEFAULT: '#1E7F4F', soft: '#E7F3EC', line: '#BFE0CE' },
        rac: { DEFAULT: '#B7791F', soft: '#FBF1DE', line: '#EBD3A8' },
        wl: { DEFAULT: '#C2410C', soft: '#FBEAE2', line: '#F0C4AE' },
        cancel: { DEFAULT: '#64748B', soft: '#EEF1F4', line: '#D7DDE4' },
        partial: { DEFAULT: '#0E7490', soft: '#E4F2F5', line: '#B9DCE4' },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['11px', { lineHeight: '16px' }],
        xs: ['12px', { lineHeight: '18px' }],
        sm: ['13px', { lineHeight: '20px' }],
        base: ['14px', { lineHeight: '22px' }],
        md: ['15px', { lineHeight: '24px' }],
        lg: ['17px', { lineHeight: '26px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '38px' }],
        '4xl': ['36px', { lineHeight: '44px' }],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '10px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,36,56,0.05), 0 1px 3px rgba(15,36,56,0.04)',
        raise: '0 2px 6px rgba(15,36,56,0.08), 0 1px 2px rgba(15,36,56,0.05)',
        pop: '0 12px 32px rgba(12,42,69,0.18), 0 2px 8px rgba(12,42,69,0.10)',
      },
      maxWidth: {
        app: '1200px',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out',
        'slide-up': 'slide-up 180ms ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
