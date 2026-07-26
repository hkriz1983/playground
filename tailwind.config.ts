import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0b1326',
          dim: '#0b1326',
          bright: '#31394d',
          'container-lowest': '#060e20',
          'container-low': '#131b2e',
          container: '#171f33',
          'container-high': '#222a3d',
          'container-highest': '#2d3449',
          tint: '#c0c1ff',
          variant: '#2d3449',
        },
        'on-surface': {
          DEFAULT: '#dae2fd',
          variant: '#c7c4d7',
        },
        'inverse-surface': '#dae2fd',
        'inverse-on-surface': '#283044',
        outline: {
          DEFAULT: '#908fa0',
          variant: '#464554',
        },
        primary: {
          DEFAULT: '#6366f1', // Override Primary
          container: '#8083ff',
          fixed: '#e1e0ff',
          'fixed-dim': '#c0c1ff',
        },
        'on-primary': {
          DEFAULT: '#1000a9',
          container: '#0d0096',
          fixed: '#07006c',
          'fixed-variant': '#2f2ebe',
        },
        'inverse-primary': '#494bd6',
        secondary: {
          DEFAULT: '#10b981', // Override Secondary
          container: '#00a572',
          fixed: '#6ffbbe',
          'fixed-dim': '#4edea3',
        },
        'on-secondary': {
          DEFAULT: '#003824',
          container: '#00311f',
          fixed: '#002113',
          'fixed-variant': '#005236',
        },
        tertiary: {
          DEFAULT: '#f59e0b', // Override Tertiary
          container: '#ca8100',
          fixed: '#ffddb8',
          'fixed-dim': '#ffb95f',
        },
        'on-tertiary': {
          DEFAULT: '#472a00',
          container: '#3e2400',
          fixed: '#2a1700',
          'fixed-variant': '#653e00',
        },
        error: {
          DEFAULT: '#ffb4ab',
          container: '#93000a',
        },
        'on-error': {
          DEFAULT: '#690005',
          container: '#ffdad6',
        },
        background: '#0b1326',
        'on-background': '#dae2fd',
        neutral: '#0f172a',
      },
      fontFamily: {
        display: ['var(--font-hanken)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
