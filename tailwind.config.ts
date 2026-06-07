import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        delphi: {
          bg:        '#0D0A06',
          surface:   '#1A1209',
          surface2:  '#261B0E',
          border:    '#3D2E1A',
          muted:     '#8B8070',
          text:      '#E8D8B0',
          gold:      '#C5AA67',
          'gold-dim':'#A8893F',
          teal:      '#4ECDA4',
          'teal-dim':'#2A9E7A',
          amber:     '#E8A844',
          danger:    '#C0392B',
        }
      },
      fontFamily: {
        display: ['cinzel', 'serif'],
        serif:   ['cormorant-garamond', 'serif'],
        sans:    ['jost', 'sans-serif'],
      }
    }
  }
}

export default config
