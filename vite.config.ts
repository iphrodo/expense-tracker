/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'Expense Tracker',
        short_name: 'Expenses',
        description: 'Keyboard-driven expense entry and analytics',
        theme_color: '#16171d',
        background_color: '#16171d',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // Data reads/writes must always hit the network — a cached Supabase
        // response would hide the other person's writes behind a stale cache.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[^/]+\.supabase\.co\/.*/,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // repository.test.ts and importer.test.ts are integration tests sharing one
    // local Postgres instance (see scripts/test-db/); parallel files would race
    // on the same tables.
    fileParallelism: false,
  },
})
