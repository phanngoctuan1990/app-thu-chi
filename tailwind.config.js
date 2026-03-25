/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // === Sunset Bento Design System (CSS variable–driven for dark mode) ===
        // Surface scale — change in dark via html.dark CSS vars
        background:                    'rgb(var(--c-bg)              / <alpha-value>)',
        surface:                       'rgb(var(--c-bg)              / <alpha-value>)',
        'surface-bright':              'rgb(var(--c-bg)              / <alpha-value>)',
        'surface-dim':                 'rgb(var(--c-surface-dim)     / <alpha-value>)',
        'surface-container':           'rgb(var(--c-sc)              / <alpha-value>)',
        'surface-container-low':       'rgb(var(--c-sc-low)          / <alpha-value>)',
        'surface-container-lowest':    'rgb(var(--c-sc-lowest)       / <alpha-value>)',
        'surface-container-high':      'rgb(var(--c-sc-high)         / <alpha-value>)',
        'surface-container-highest':   'rgb(var(--c-sc-highest)      / <alpha-value>)',
        'surface-variant':             'rgb(var(--c-sc-highest)      / <alpha-value>)',
        'surface-tint':                '#bf2a02',

        // Text — change in dark
        'on-surface':                  'rgb(var(--c-on-surface)      / <alpha-value>)',
        'on-surface-variant':          'rgb(var(--c-on-surface-var)  / <alpha-value>)',
        'on-background':               'rgb(var(--c-on-surface)      / <alpha-value>)',

        // Borders — change in dark
        outline:                       'rgb(var(--c-outline)         / <alpha-value>)',
        'outline-variant':             'rgb(var(--c-outline-var)     / <alpha-value>)',

        // Inverse — SWAP in dark mode
        'inverse-surface':             'rgb(var(--c-inv-surface)     / <alpha-value>)',
        'inverse-on-surface':          'rgb(var(--c-inv-on-surface)  / <alpha-value>)',

        // Brand — same in both modes
        primary:                '#bf2a02',
        'primary-container':    '#ffac99',
        'primary-fixed':        '#ffac99',
        'primary-fixed-dim':    '#ff987f',
        'on-primary':           '#ffffff',
        'on-primary-container': '#781600',
        'on-primary-fixed':     '#530c00',
        'on-primary-fixed-variant': '#881a00',
        'inverse-primary':      '#fe572f',

        secondary:              '#007075',
        'secondary-container':  '#97f8ff',
        'secondary-fixed':      '#97f8ff',
        'secondary-fixed-dim':  '#88e9f0',
        'secondary-dim':        '#006268',
        'on-secondary':         '#ffffff',
        'on-secondary-container': '#005f64',
        'on-secondary-fixed':   '#004b4f',
        'on-secondary-fixed-variant': '#006a6f',

        tertiary:               '#726500',
        'tertiary-container':   '#fbe449',
        'tertiary-fixed':       '#fbe449',
        'tertiary-fixed-dim':   '#edd53b',
        'tertiary-dim':         '#645900',
        'on-tertiary':          '#ffffff',
        'on-tertiary-container':'#5d5200',
        'on-tertiary-fixed':    '#484000',
        'on-tertiary-fixed-variant': '#685c00',

        error:                  '#b3374e',
        'error-container':      '#f76a80',
        'error-dim':            '#770326',
        'on-error':             '#ffffff',
        'on-error-container':   '#68001f',

        'accent-emerald':       '#10b981',
      },
      fontFamily: {
        headline: ['"Plus Jakarta Sans"', 'sans-serif'],
        body:     ['Inter',               'sans-serif'],
        label:    ['"Space Grotesk"',     'monospace'],
      },
      borderRadius: {
        DEFAULT: '1rem',
        lg:      '2rem',
        xl:      '3rem',
        full:    '9999px',
      },
      boxShadow: {
        bento:    '0 32px 32px -4px rgba(56,57,41,0.06)',
        'bento-sm': '0 4px 20px rgba(56,57,41,0.04)',
        fab:      '0 8px 32px rgba(191,42,2,0.30)',
      },
    },
  },
  plugins: [],
}
