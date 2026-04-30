/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        blue: { 50: '#eef2f6', 100: '#d6e1ed', 200: '#b0c6df', 300: '#81a4cd', 400: '#517fb5', 500: '#356398', 600: '#254d7d', 700: '#1f3e66', 800: '#1b3555', 900: '#0f2a44', 950: '#0a1b2d' },
        indigo: { 50: '#eef2f6', 100: '#d6e1ed', 200: '#b0c6df', 300: '#81a4cd', 400: '#517fb5', 500: '#356398', 600: '#254d7d', 700: '#1f3e66', 800: '#1b3555', 900: '#0f2a44', 950: '#0a1b2d' },
        cyan: { 50: '#eef2f6', 100: '#d6e1ed', 200: '#b0c6df', 300: '#81a4cd', 400: '#517fb5', 500: '#356398', 600: '#254d7d', 700: '#1f3e66', 800: '#1b3555', 900: '#0f2a44', 950: '#0a1b2d' },
        amber: { 50: '#fbf8eb', 100: '#f5eed0', 200: '#ebdca4', 300: '#dfc471', 400: '#d4ab46', 500: '#c9a227', 600: '#ab7f1d', 700: '#895e1a', 800: '#724c1a', 900: '#62401a', 950: '#38220c' },
        yellow: { 50: '#fbf8eb', 100: '#f5eed0', 200: '#ebdca4', 300: '#dfc471', 400: '#d4ab46', 500: '#c9a227', 600: '#ab7f1d', 700: '#895e1a', 800: '#724c1a', 900: '#62401a', 950: '#38220c' },
        orange: { 50: '#fbf8eb', 100: '#f5eed0', 200: '#ebdca4', 300: '#dfc471', 400: '#d4ab46', 500: '#c9a227', 600: '#ab7f1d', 700: '#895e1a', 800: '#724c1a', 900: '#62401a', 950: '#38220c' },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Role-specific colors
        student: {
          DEFAULT: "hsl(var(--student))",
          foreground: "hsl(var(--student-foreground))",
        },
        mentor: {
          DEFAULT: "hsl(var(--mentor))",
          foreground: "hsl(var(--mentor-foreground))",
        },
        "subject-handler": {
          DEFAULT: "hsl(var(--handler))",
          foreground: "hsl(var(--handler-foreground))",
        },
        handler: {
          DEFAULT: "hsl(var(--handler))",
          foreground: "hsl(var(--handler-foreground))",
        },
        hod: {
          DEFAULT: "hsl(var(--hod))",
          foreground: "hsl(var(--hod-foreground))",
        },
        admin: {
          DEFAULT: "hsl(var(--admin))",
          foreground: "hsl(var(--admin-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(30px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.6s ease-out forwards",
        "slide-up": "slide-up 0.5s ease-out forwards",
        "float": "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};
