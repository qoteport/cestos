/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
      },
      borderRadius: {
        none: '0px',
        sm: '0.375rem',
        DEFAULT: '0.5rem',
        md: '0.625rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        full: '9999px',
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-md': '0 4px 16px rgba(27, 79, 138, 0.08)',
        'card-lg': '0 8px 32px rgba(27, 79, 138, 0.12)',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-in-out',
        'slide-up': 'slideUp 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        'modal-backdrop-in': 'modalBackdropIn 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'modal-backdrop-out': 'modalBackdropOut 190ms cubic-bezier(0.4, 0, 1, 1) forwards',
        'modal-content-in': 'modalContentIn 240ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'modal-content-out': 'modalContentOut 190ms cubic-bezier(0.4, 0, 1, 1) forwards',
        'sheet-in': 'sheetInBottom 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'sheet-out': 'sheetOutBottom 190ms cubic-bezier(0.4, 0, 1, 1) forwards',
        'drawer-in': 'drawerInRight 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'drawer-out': 'drawerOutRight 190ms cubic-bezier(0.4, 0, 1, 1) forwards',
        shimmer: 'shimmer 1.5s infinite',
      },
      keyframes: {
        modalBackdropIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        modalBackdropOut: { '0%': { opacity: '1' }, '100%': { opacity: '0' } },
        modalContentIn: { '0%': { opacity: '0', transform: 'scale(0.95) translateY(12px)' }, '100%': { opacity: '1', transform: 'scale(1) translateY(0)' } },
        modalContentOut: { '0%': { opacity: '1', transform: 'scale(1) translateY(0)' }, '100%': { opacity: '0', transform: 'scale(0.95) translateY(12px)' } },
        sheetInBottom: { '0%': { opacity: '0', transform: 'translateY(100%)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        sheetOutBottom: { '0%': { opacity: '1', transform: 'translateY(0)' }, '100%': { opacity: '0', transform: 'translateY(100%)' } },
        drawerInRight: { '0%': { opacity: '0', transform: 'translateX(100%)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        drawerOutRight: { '0%': { opacity: '1', transform: 'translateX(0)' }, '100%': { opacity: '0', transform: 'translateX(100%)' } },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};