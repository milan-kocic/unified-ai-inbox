/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
      },
      colors: {
        bg: 'var(--bg)',
        'bg-secondary': 'var(--bg-secondary)',
        card: 'var(--card)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        surface: 'var(--surface)',
        'surface-hover': 'var(--surface-hover)',
        'input-bg': 'var(--input-bg)',
        'input-border': 'var(--input-border)',
        'modal-bg': 'var(--modal-bg)',
        'ai-bg': 'var(--ai-bg)',
        'ai-border': 'var(--ai-border)',
        'ai-text': 'var(--ai-text)',
        'reply-bg': 'var(--reply-bg)',
        'reply-border': 'var(--reply-border)',
        'reply-text': 'var(--reply-text)',
        'red-bg': 'var(--red-bg)',
        'red-text': 'var(--red-text)',
        email: '#3b82f6',
        whatsapp: '#22c55e',
        viber: '#8b5cf6',
        slack: '#4a154b',
        ai: '#fbbf24',
      },
      borderRadius: {
        'card': '16px',
        'btn': '8px',
      }
    },
  },
  plugins: [],
}
