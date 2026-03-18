import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { VitePWA } from "vite-plugin-pwa";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

const APP_NAME = process.env.VITE_APP_NAME ?? "Execora";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: ["bharat-ubuntu.tail33978a.ts.net"],
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:3006",
        changeOrigin: true,
      },
      "/pub": {
        target: "http://localhost:3006",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:3006",
        ws: true,
        changeOrigin: true,
      },
    },
  },
  plugins: [
    {
      name: "app-name-transform",
      transformIndexHtml(html) {
        return html.replace(/\{\{APP_NAME\}\}/g, APP_NAME);
      },
      closeBundle() {
        const manifestPath = path.resolve(__dirname, "public/manifest.webmanifest");
        if (fs.existsSync(manifestPath)) {
          let m = fs.readFileSync(manifestPath, "utf-8");
          m = m.replace(/\{\{APP_NAME\}\}/g, APP_NAME);
          fs.writeFileSync(path.resolve(__dirname, "dist/manifest.webmanifest"), m);
        }
      },
    },
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: false, // use public/manifest.webmanifest directly
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MiB (main chunk ~2.2 MB)
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // Products — stale-while-revalidate, cache 24h
            urlPattern: /^\/api\/v1\/(products|items)/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "api-products",
              expiration: { maxEntries: 500, maxAgeSeconds: 86400 },
            },
          },
          {
            // Customers / parties — stale-while-revalidate, cache 1h
            urlPattern: /^\/api\/v1\/(customers|parties)/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "api-customers",
              expiration: { maxEntries: 200, maxAgeSeconds: 3600 },
            },
          },
          {
            // Invoices — network-first (must be fresh), 5s timeout
            urlPattern: /^\/api\/v1\/invoices/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-invoices",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 3600 },
            },
          },
          {
            // All other API calls — network-first
            urlPattern: /^\/api\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-general",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 300 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
    mode === "development" && componentTagger(),
    mode === "analyze" &&
      visualizer({
        open: true,
        filename: "dist/stats.html",
        gzipSize: true,
        brotliSize: true,
        template: "treemap",
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@execora/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
    dedupe: ["react", "react-dom"],
  },
}));
