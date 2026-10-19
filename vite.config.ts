import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const BASE = '/shorashim/'

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Shorashim',
        short_name: 'Shorashim',
        description: 'Personal Hebrew trainer — Sheat Ivrit II',
        lang: 'en',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FAF7F2',
        theme_color: '#FAF7F2',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell + the encrypted text bundle + its manifest are precached so the trainer opens offline; the
        // loader reads manifest.json first, so leaving it out made every offline start fail. The dummy bundle is
        // precached too (tiny, public) so the offline e2e test can run. The model verbs' recordings (~5 KB each,
        // ~0.6 MB in all) are precached as well, so every form plays in airplane mode; the book's tracks never are.
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,ico}', 'data/*.enc', 'data/manifest.json', 'data/forms/**/*.enc', 'data-test/bundle.enc', 'data-test/manifest.json', 'data-test/forms/**/*.enc'],
        globIgnores: ['**/node_modules/**/*', 'data/audio/**', 'data-test/audio/**'],
        runtimeCaching: [
          {
            // one encrypted file per track, ~40 MB in all: cached after the first play, never precached
            urlPattern: /\/data(-test)?\/audio\/[^/]+\.enc$/,
            handler: 'CacheFirst',
            options: { cacheName: 'audio', expiration: { maxEntries: 60 }, cacheableResponse: { statuses: [0, 200] } },
          },
        ],
        maximumFileSizeToCacheInBytes: 60 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
  },
})
