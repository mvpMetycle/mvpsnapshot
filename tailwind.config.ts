import type { Config } from "tailwindcss";

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
        sans: ['DM Sans', 'sans-serif'],
      },
      colors: {
        /* Metycle Brand Colors */
        metycle: {
          primary: "hsl(183, 41%, 25%)",       // #255659 - Dark Teal
          secondary: "hsl(169, 83%, 70%)",     // #70F3DC - Mint
          tertiary: "hsl(190, 100%, 94%)",     // #E2FAFF - Light Cyan
          error: "hsl(0, 76%, 47%)",           // #D41D1D
          warning: "hsl(38, 94%, 60%)",        // #F9B43A
          neutral: "hsl(0, 0%, 22%)",          // #393939
        },
        /* Primary Scale - Dark Teal */
        "primary-50": "hsl(var(--primary-50))",
        "primary-100": "hsl(var(--primary-100))",
        "primary-200": "hsl(var(--primary-200))",
        "primary-300": "hsl(var(--primary-300))",
        "primary-400": "hsl(var(--primary-400))",
        "primary-500": "hsl(var(--primary-500))",
        "primary-600": "hsl(var(--primary-600))",
        "primary-700": "hsl(var(--primary-700))",
        "primary-800": "hsl(var(--primary-800))",
        "primary-900": "hsl(var(--primary-900))",
        /* Secondary Scale - Mint */
        "secondary-50": "hsl(var(--secondary-50))",
        "secondary-100": "hsl(var(--secondary-100))",
        "secondary-200": "hsl(var(--secondary-200))",
        "secondary-300": "hsl(var(--secondary-300))",
        "secondary-400": "hsl(var(--secondary-400))",
        "secondary-500": "hsl(var(--secondary-500))",
        "secondary-600": "hsl(var(--secondary-600))",
        "secondary-700": "hsl(var(--secondary-700))",
        "secondary-800": "hsl(var(--secondary-800))",
        "secondary-900": "hsl(var(--secondary-900))",
        /* Semantic Colors */
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
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
        tertiary: {
          DEFAULT: "hsl(var(--tertiary))",
          foreground: "hsl(var(--tertiary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        neutral: {
          DEFAULT: "hsl(var(--neutral))",
          foreground: "hsl(var(--neutral-foreground))",
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
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
