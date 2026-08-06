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
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
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
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          deep: "hsl(var(--success-deep))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        buy: "hsl(var(--buy))",
        sell: "hsl(var(--sell))",
        affiliate: {
          DEFAULT: "hsl(var(--affiliate))",
          foreground: "hsl(var(--affiliate-foreground))",
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
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        "premium-glow": {
          "0%, 100%": { 
            boxShadow: "0 0 15px 2px hsl(45 100% 50% / 0.3), 0 0 30px 5px hsl(45 100% 50% / 0.1)",
            borderColor: "hsl(45 100% 50% / 0.5)"
          },
          "50%": { 
            boxShadow: "0 0 25px 5px hsl(45 100% 50% / 0.4), 0 0 50px 10px hsl(45 100% 50% / 0.2)",
            borderColor: "hsl(45 100% 60% / 0.7)"
          },
        },
        "premium-shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "crown-bounce": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "25%": { transform: "translateY(-2px) rotate(-5deg)" },
          "75%": { transform: "translateY(-2px) rotate(5deg)" },
        },
        "tp-tick": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "50%": { transform: "scale(1.3)", opacity: "1" },
          "75%": { transform: "scale(0.9)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "border-glow": {
          "0%, 100%": { 
            borderColor: "hsl(45 100% 50% / 0.4)",
            boxShadow: "inset 0 0 10px hsl(45 100% 50% / 0.1)"
          },
          "50%": { 
            borderColor: "hsl(45 100% 60% / 0.7)",
            boxShadow: "inset 0 0 20px hsl(45 100% 50% / 0.2)"
          },
        },
        "price-up": {
          "0%": { backgroundColor: "hsl(142 76% 36% / 0.3)", transform: "scale(1.05)" },
          "100%": { backgroundColor: "transparent", transform: "scale(1)" },
        },
        "price-down": {
          "0%": { backgroundColor: "hsl(0 84% 60% / 0.3)", transform: "scale(1.05)" },
          "100%": { backgroundColor: "transparent", transform: "scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 3s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
        "premium-glow": "premium-glow 2s ease-in-out infinite",
        "premium-shimmer": "premium-shimmer 3s linear infinite",
        "crown-bounce": "crown-bounce 2s ease-in-out infinite",
        "border-glow": "border-glow 2s ease-in-out infinite",
        "tp-tick": "tp-tick 0.5s ease-out forwards",
        "price-up": "price-up 0.4s ease-out",
        "price-down": "price-down 0.4s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
