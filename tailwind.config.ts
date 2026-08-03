import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // ------------------------------------------------------------
        // Identidad de marca ABASTECER EMPRESARIAL S.A.S.
        // Fuente: manual de identidad (paleta oficial)
        //   #0D1B2A azul noche  |  #16823C verde  |  #F2B705 amarillo
        //   #636B73 gris        |  #F2F4F7 gris claro
        // ------------------------------------------------------------
        marca: {
          50: "#F2F4F7",
          100: "#E2E7EE",
          200: "#C3CDDA",
          300: "#94A5BB",
          400: "#5F7793",
          500: "#385474",
          600: "#1D3A57",
          700: "#132B43",
          800: "#0F2135",
          900: "#0D1B2A",
          950: "#07111B",
        },
        verde: {
          50: "#EFFAF2",
          100: "#D6F2DF",
          200: "#AEE4C1",
          300: "#77CE9A",
          400: "#41B171",
          500: "#1F9A50",
          600: "#16823C",
          700: "#126832",
          800: "#11522A",
          900: "#0E4324",
        },
        oro: {
          50: "#FFFAEB",
          100: "#FEF1C7",
          200: "#FDE28A",
          300: "#FCCD4D",
          400: "#F2B705",
          500: "#DDA303",
          600: "#BC7E06",
          700: "#9C5C09",
          800: "#7E480E",
          900: "#6A3B0F",
        },
        acero: {
          50: "#F6F7F8",
          100: "#EDEEF0",
          200: "#D8DBDE",
          300: "#B9BEC3",
          400: "#8F969D",
          500: "#636B73",
          600: "#565D64",
          700: "#494E54",
          800: "#3F4348",
          900: "#37393E",
        },
      },
      fontFamily: {
        marca: ["var(--font-montserrat)", "Montserrat", "system-ui", "sans-serif"],
      },
      boxShadow: {
        marca: "0 20px 45px -20px rgba(13, 27, 42, 0.45)",
        tarjeta: "0 2px 8px -2px rgba(13, 27, 42, 0.08), 0 12px 32px -12px rgba(13, 27, 42, 0.12)",
      },
      backgroundImage: {
        "degradado-marca": "linear-gradient(135deg, #0D1B2A 0%, #132B43 45%, #16823C 140%)",
        "degradado-oro": "linear-gradient(135deg, #F2B705 0%, #DDA303 100%)",
      },
      keyframes: {
        "aparecer-arriba": {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "aparecer": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "flotar": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "aparecer-arriba": "aparecer-arriba 0.6s ease-out both",
        aparecer: "aparecer 0.5s ease-out both",
        flotar: "flotar 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
