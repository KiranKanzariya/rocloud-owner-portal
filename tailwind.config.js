/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary blue family
        midnight: '#061C33',
        navy: {
          DEFAULT: '#0C447C',   // primary brand
          mid:     '#185FA5',
          light:   '#378ADD',
        },
        mist: '#B5D4F4',
        foam: '#E6F1FB',
        // Accent teal family
        teal: {
          DEFAULT: '#1D9E75',   // accent / success
          mid:     '#5DCAA5',
          light:   '#E1F5EE',
        },
        // Semantic
        amber: {
          DEFAULT: '#EF9F27',
          light:   '#FAEEDA',
        },
        danger: {
          DEFAULT: '#E24B4A',
          light:   '#FCEBEB',
        },
        // Neutral
        ink: {
          DEFAULT: '#444441',
          mid:     '#888780',
          light:   '#D3D1C7',
        },
        shell: '#F1EFE8',
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      fontSize: {
        // ROCloud type scale — never use Tailwind defaults
        'micro': ['11px',  { lineHeight: '1.4' }],
        'caption': ['12px', { lineHeight: '1.5' }],
        'body':  ['13px',   { lineHeight: '1.6' }],
        'lead':  ['15px',   { lineHeight: '1.6' }],
        'h4':    ['16px',   { lineHeight: '1.3', fontWeight: '500' }],
        'h3':    ['18px',   { lineHeight: '1.3', fontWeight: '600' }],
        'h2':    ['22px',   { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.5px' }],
        'h1':    ['28px',   { lineHeight: '1.15', fontWeight: '700', letterSpacing: '-1px' }],
        'hero':  ['42px',   { lineHeight: '1.08', fontWeight: '800', letterSpacing: '-1.5px' }],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};
