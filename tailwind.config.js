/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{js,ts,jsx,tsx}", // 看你src路徑怎麼寫
    ],
    theme: {
      extend: {
        animation: {
          shake: 'shake 0.5s ease-in-out',
        },
        keyframes: {
          shake: {
            '0%, 100%': { transform: 'translateX(0)' },
            '25%': { transform: 'translateX(-5px)' },
            '75%': { transform: 'translateX(5px)' },
          },
        },
      },
    },
    plugins: [],
  }
  