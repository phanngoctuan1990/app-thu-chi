/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // === Sunset Bento Design System ===
        background: '#feffd5',
        surface: '#feffd5',
        'surface-bright': '#feffd5',
        'surface-dim': '#e5e4c8',
        'surface-container': '#f6f4e4',
        'surface-container-low': '#fcfaec',
        'surface-container-lowest': '#ffffff',
        'surface-container-high': '#f0efdb',
        'surface-container-highest': '#ebe9d2',
        'surface-variant': '#ebe9d2',
        'surface-tint': '#bf2a02',

        primary: '#bf2a02',
        'primary-container': '#ffac99',
        'primary-fixed': '#ffac99',
        'primary-fixed-dim': '#ff987f',
        'on-primary': '#ffffff',
        'on-primary-container': '#781600',
        'on-primary-fixed': '#530c00',
        'on-primary-fixed-variant': '#881a00',
        'inverse-primary': '#fe572f',

        secondary: '#007075',
        'secondary-container': '#97f8ff',
        'secondary-fixed': '#97f8ff',
        'secondary-fixed-dim': '#88e9f0',
        'secondary-dim': '#006268',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#005f64',
        'on-secondary-fixed': '#004b4f',
        'on-secondary-fixed-variant': '#006a6f',

        tertiary: '#726500',
        'tertiary-container': '#fbe449',
        'tertiary-fixed': '#fbe449',
        'tertiary-fixed-dim': '#edd53b',
        'tertiary-dim': '#645900',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#5d5200',
        'on-tertiary-fixed': '#484000',
        'on-tertiary-fixed-variant': '#685c00',

        'on-surface': '#383929',
        'on-surface-variant': '#656553',
        'on-background': '#383929',
        outline: '#82826e',
        'outline-variant': '#bbbaa4',

        'inverse-surface': '#0e0f09',
        'inverse-on-surface': '#9f9d94',

        error: '#b3374e',
        'error-container': '#f76a80',
        'error-dim': '#770326',
        'on-error': '#ffffff',
        'on-error-container': '#68001f',

        // Custom accent
        'accent-emerald': '#10b981',
      },
      fontFamily: {
        headline: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['"Space Grotesk"', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '1rem',
        lg: '2rem',
        xl: '3rem',
        full: '9999px',
      },
      boxShadow: {
        bento: '0 32px 32px -4px rgba(56,57,41,0.06)',
        'bento-sm': '0 4px 20px rgba(56,57,41,0.04)',
        fab: '0 8px 32px rgba(191,42,2,0.30)',
      },
    },
  },
  plugins: [],
}
