import { createSystem, defaultConfig } from "@chakra-ui/react"

// Define a minimal custom system overriding a few base tokens.
export const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors: {
        charcoal: { value: "#282c34" }, // page background (dark)
        bone: { value: "#F9F6EE" }, // light page/card background
        midnight: { value: "#2c3e50" },
        silver: { value: "#bdc3c7" },
        clouds: { value: "#ecf0f1" },
        black: { value: "#000000" },
        white: { value: "#ffffff" },
        lightGray: { value: "#aaa" },
        veryLightGray: { value: "#f0f0f0" },
        // Greens
        emerald: { value: "#2ecc71" },
        nephritis: { value: "#27ae60" },
        // Blues
        belize: { value: "#2980b9" },
        peter: { value: "#3498db" },
        sky: { value: "#87ceeb" },
        // Status
        alizarin: { value: "#e74c3c" },
        // Brand scale (uses greens by default)
        brand: {
          50: { value: "#e8f7ef" },
          100: { value: "#c9ecd9" },
          200: { value: "#a4e0c1" },
          300: { value: "#7fd4a9" },
          400: { value: "#59c890" },
          500: { value: "#2ecc71" }, // emerald
          600: { value: "#27ae60" }, // nephritis
          700: { value: "#1f8c4e" },
          800: { value: "#176b3c" },
          900: { value: "#0f4a2a" },
        },
      },
      fonts: {
        heading: { value: "'Trebuchet MS', 'Lucida Sans Unicode', 'Lucida Grande', 'Lucida Sans', Arial, sans-serif" },
        body: { value: "'Trebuchet MS', 'Lucida Sans Unicode', 'Lucida Grande', 'Lucida Sans', Arial, sans-serif" },
        mono: { value: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" },
      },
      radii: {
        md: { value: "8px" },
        lg: { value: "12px" },
      },
      sizes: {
        container: {
          sm: { value: "640px" },
          md: { value: "768px" },
          lg: { value: "1024px" },
          xl: { value: "1280px" },
        },
      },
    },
    semanticTokens: {
      colors: {
        // Foreground/background coordinated with next-themes
        fg: { value: { _light: "{colors.black}", _dark: "{colors.veryLightGray}" } },
        bg: { value: { _light: "{colors.bone}", _dark: "{colors.charcoal}" } },
        // Links
        link: { value: { _light: "{colors.belize}", _dark: "{colors.sky}" } },
        linkButton: { value: { _light: "{colors.nephritis}", _dark: "{colors.emerald}" } },
        linkHover: { value: { _light: "{colors.peter}", _dark: "{colors.peter}" } },
        brand: {
          default: { value: "{colors.brand.500}" },
          emphasis: { value: "{colors.brand.600}" },
          muted: { value: "{colors.brand.100}" },
          subtle: { value: "{colors.brand.50}" },
        },
        border: { value: { _light: "{colors.silver}", _dark: "{colors.clouds}" } },
        tableHeaderBg: { value: { _light: "{colors.midnight}", _dark: "{colors.midnight}" } },
        tableBg: { value: { _light: "{colors.white}", _dark: "#1a1a1a" } },
        tableText: { value: { _light: "{colors.black}", _dark: "{colors.veryLightGray}" } },
        tableHoverBg: { value: { _light: "{colors.clouds}", _dark: "#2a2a2a" } },
        tableTotalsBg: { value: { _light: "{colors.silver}", _dark: "{colors.charcoal}" } },
        cardBg: { value: { _light: "{colors.white}", _dark: "#2a2a2a" } },
        subtleBorder: { value: { _light: "{colors.clouds}", _dark: "#404040" } },
        error: { value: { _light: "{colors.alizarin}", _dark: "{colors.alizarin}" } },
      },
    },
    globalCss: {
      body: {
        bg: "bg",
        color: "fg",
        fontFamily: "body",
        lineHeight: "1.5",
      },
      a: {
        color: "link",
        textDecoration: "underline",
        _hover: {
          color: "linkHover",
        },
      },
      'h1, h2, h3, h4, h5, h6': {
        fontFamily: 'heading',
        fontWeight: 'bold',
      },
      h1: {
        fontSize: '2.25rem',
        lineHeight: '2.5rem',
        my: '1rem',
      },
      h2: {
        fontSize: '1.875rem',
        lineHeight: '2.25rem',
        my: '0.75rem',
      },
      h3: {
        fontSize: '1.5rem',
        lineHeight: '2rem',
        my: '0.5rem',
      },
      h4: {
        fontSize: '1.25rem',
        lineHeight: '1.75rem',
        my: '0.5rem',
      },
    },
  },
})

export default system


