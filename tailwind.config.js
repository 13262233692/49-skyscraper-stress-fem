/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        orbitron: ['Orbitron', 'monospace'],
        body: ['Source Sans 3', 'sans-serif'],
      },
      colors: {
        'deep-space': '#0A0E1A',
        'cyber-cyan': '#00D4FF',
        'danger-red': '#FF2D55',
      },
    },
  },
  plugins: [],
};
