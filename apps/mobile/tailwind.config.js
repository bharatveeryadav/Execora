/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.{ts,tsx}", "./index.ts"],
    presets: [require("nativewind/preset")],
    darkMode: "media",
    theme: {
        extend: {
            colors: {
                // Match apps/web CSS variables (index.css) for visual parity
                primary: {
                    DEFAULT: "#e67e22",
                    foreground: "#ffffff",
                    50: "#fef3e8",
                    100: "#fde8d0",
                    200: "#fbd0a1",
                    500: "#e67e22",
                    600: "#d66b0f",
                    700: "#b3580c",
                    400: "#f0a050",
                    800: "#8f4509",
                },
                secondary: {
                    DEFAULT: "#3d7a9e",
                    foreground: "#ffffff",
                },
                background: "#f1f3f6",
                foreground: "#1e293b",
                card: "#fafbfc",
                muted: {
                    DEFAULT: "#e8ebf5",
                    foreground: "#64748b",
                },
                destructive: {
                    DEFAULT: "#cf2a2a",
                    foreground: "#ffffff",
                },
                success: "#1a9248",
                warning: "#e6a319",
                border: "#d1d6e0",
                input: "#d1d6e0",
                ring: "#e67e22",
            },
            fontFamily: {
                sans: ["Inter_400Regular", "System"],
                medium: ["Inter_500Medium", "System"],
                bold: ["Inter_700Bold", "System"],
            },
            boxShadow: {
                sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
            },
        },
    },
};