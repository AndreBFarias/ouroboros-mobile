/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  // darkMode 'class' permite controlar dark via classe (.dark no html
  // ou StyleSheet.setFlag('darkMode','class') no RN). Sem isso, o
  // NativeWind 4 default usa media query (prefers-color-scheme), o
  // que conflita no web e impede a paleta Dracula de ser aplicada.
  darkMode: 'class',
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        'bg-page': '#14151a',
        bg: '#282a36',
        'bg-alt': '#1e1f29',
        'bg-elev': '#44475a',
        fg: '#f8f8f2',
        muted: '#c9c9cc',
        'muted-decor': '#6272a4',
        purple: '#bd93f9',
        pink: '#ff79c6',
        cyan: '#8be9fd',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        orange: '#ffb86c',
        red: '#ff5555',
      },
      fontFamily: {
        mono: ['JetBrainsMono_400Regular'],
        'mono-medium': ['JetBrainsMono_500Medium'],
      },
    },
  },
  plugins: [],
};
