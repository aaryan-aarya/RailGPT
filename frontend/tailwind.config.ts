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
        paper: 'rgb(var(--color-paper) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        body: 'rgb(var(--color-body) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        line: 'rgb(var(--color-line) / <alpha-value>)',
        brand: {
          DEFAULT: 'rgb(var(--color-brand) / <alpha-value>)',
          strong: 'rgb(var(--color-brand-strong) / <alpha-value>)',
          soft: 'rgb(var(--color-brand-soft) / <alpha-value>)',
          tint: 'rgb(var(--color-brand-tint) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          strong: 'rgb(var(--color-accent-strong) / <alpha-value>)',
          soft: 'rgb(var(--color-accent-soft) / <alpha-value>)',
        },
        ok: { DEFAULT: 'rgb(var(--color-ok) / <alpha-value>)', soft: 'rgb(var(--color-ok-soft) / <alpha-value>)', line: 'rgb(var(--color-ok-line) / <alpha-value>)' },
        rac: { DEFAULT: 'rgb(var(--color-rac) / <alpha-value>)', soft: 'rgb(var(--color-rac-soft) / <alpha-value>)', line: 'rgb(var(--color-rac-line) / <alpha-value>)' },
        wl: { DEFAULT: 'rgb(var(--color-wl) / <alpha-value>)', soft: 'rgb(var(--color-wl-soft) / <alpha-value>)', line: 'rgb(var(--color-wl-line) / <alpha-value>)' },
        cancel: { DEFAULT: 'rgb(var(--color-cancel) / <alpha-value>)', soft: 'rgb(var(--color-cancel-soft) / <alpha-value>)', line: 'rgb(var(--color-cancel-line) / <alpha-value>)' },
        partial: { DEFAULT: 'rgb(var(--color-partial) / <alpha-value>)', soft: 'rgb(var(--color-partial-soft) / <alpha-value>)', line: 'rgb(var(--color-partial-line) / <alpha-value>)' },
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
        sm: '8px',
        DEFAULT: '12px',
        md: '16px',
        lg: '22px',
      },
      boxShadow: {
        card: '0 8px 24px rgba(24,53,46,0.055), 0 1px 3px rgba(24,53,46,0.04)',
        raise: '0 16px 36px rgba(24,53,46,0.12), 0 3px 8px rgba(24,53,46,0.05)',
        pop: '0 24px 64px rgba(16,74,59,0.2), 0 4px 12px rgba(16,74,59,0.08)',
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
