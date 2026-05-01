import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "url";
import path from "path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, repoRoot, "");
  const backendPort = rootEnv.DEV_BACKEND_PORT || "4006";
  return {
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id: string) => {
            const posix = id.replace(/\\/g, "/");
            if (posix.includes("node_modules/pdfjs-dist/") || posix.includes("node_modules/react-pdf/")) return "pdf-viewer";
            if (posix.includes("node_modules/epubjs/")) return "epub-viewer";
            return undefined;
          },
        },
      },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon-96x96.png", "apple-touch-icon.png", "pwa-192x192.png", "pwa-512x512.png"],
        manifest: {
          name: "Nookline",
          short_name: "Nookline",
          description: "Your personal library: books, series, and reader.",
          theme_color: "#070e1d",
          background_color: "#070e1d",
          display: "standalone",
          orientation: "any",
          start_url: "/",
          scope: "/",
          icons: [
            { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          globPatterns: ["**/*.{js,css,html,ico,svg,png,webp,jpg,jpeg,woff2}"],
          globIgnores: ["**/library-banners/*.jpg", "**/library-banners/*.jpeg"],
          navigateFallback: "index.html",
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts",
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              urlPattern: ({ request, url }) => request.method === "GET" && url.origin === self.location.origin && url.pathname.startsWith("/api/") && !url.pathname.startsWith("/api/files/"),
              handler: "NetworkFirst",
              options: {
                cacheName: "api-get",
                networkTimeoutSeconds: 8,
                expiration: { maxEntries: 32, maxAgeSeconds: 120 },
              },
            },
          ],
        },
        devOptions: { enabled: false },
      }),
    ],
    optimizeDeps: {
      include: ["epubjs", "pdfjs-dist", "react-pdf"],
    },
    server: {
      port: 3000,
      proxy: {
        "/api": {
          target: `http://127.0.0.1:${backendPort}`,
          changeOrigin: true,
        },
      },
    },
  };
});
