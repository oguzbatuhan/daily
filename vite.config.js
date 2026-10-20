import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages serves the site under "https://user.github.io/repo-name/".
// The workflow (deploy.yml) passes the base path via VITE_BASE; locally "/" is used.
const base = process.env.VITE_BASE || "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    // Generates the manifest + service worker that enable "Install app" / "Add to Home Screen".
    VitePWA({
      registerType: "autoUpdate",
      workbox: { globPatterns: ["**/*.{js,css,html,woff2,png,svg}"] },
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        id: base,
        name: "Günlük",
        short_name: "Günlük",
        description: "Sade, hızlı günlük defteri. Çevrimdışı çalışır, yedeklenir, Google Drive ile eşitlenir.",
        lang: "tr",
        start_url: base,
        scope: base,
        display: "standalone",
        orientation: "portrait",
        background_color: "#0c1216",
        // Fallback only; the <meta name="theme-color"> tags in index.html follow light/dark mode
        theme_color: "#f6f7f8",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        // Long-press the home screen icon -> straight to a new entry
        shortcuts: [
          {
            name: "Yeni yazı",
            short_name: "Yeni yazı",
            url: base + "?new=1",
            icons: [{ src: "icon-192.png", sizes: "192x192", type: "image/png" }],
          },
        ],
      },
    }),
  ],
});
