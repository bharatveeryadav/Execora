/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.{ts,tsx}", "./index.ts"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                // Keep in sync with apps/web CSS variables for visual parity
                primary: {
                    DEFAULT: "#6366f1",
                    foreground: "#ffffff",
                },
                background: "#ffffff",
                foreground: "#0f172a",
                muted: {
                    DEFAULT: "#f1f5f9",
                    foreground: "#64748b",
                },
                destructive: {
                    DEFAULT: "#ef4444",
                    foreground: "#ffffff",
                },
                border: "#e2e8f0",
                input: "#e2e8f0",
                ring: "#6366f1",
            },
            fontFamily: {
                sans: ["Inter_400Regular", "System"],
                medium: ["Inter_500Medium", "System"],
                bold: ["Inter_700Bold", "System"],
            },
        },
    },
};