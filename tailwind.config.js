/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",

        canvas: "var(--canvas)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "app-border": "var(--border)",
        "text-hi": "var(--text-hi)",
        "text-lo": "var(--text-lo)",

        brand: {
          500: "#f05d23",
          600: "#d94f1e",
        },

        // GCG brand colors
        "gcg-orange":      "#f05d23",  // primary — burnt orange
        "gcg-orange-dark": "#d94f1e",  // hover / gradient end
        "gcg-brown":       "#231812",  // dark secondary
        status: {
          success: "#22c55e",
          warning: "#eab308",
          danger: "#ef4444",
          info: "#3b82f6",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
        display: ["var(--font-clover-display)", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "6px",
        md: "6px",
        lg: "8px",
      },
      animation: {
        ping: 'ping 2.0s linear infinite', // Adjust the duration here
      },
    },
  },
  plugins: [],
};
