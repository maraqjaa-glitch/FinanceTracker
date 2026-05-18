import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'FinFort',
        short_name: 'FinFort',
        description: 'Personal finance tracker',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.frankfurter\.app/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'exchange-rates',
              expiration: {
                maxAgeSeconds: 14400, // 4 hours
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // disable SW in dev to avoid caching issues
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Recharts into its own chunk
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'recharts'
          }
          // Heavy form/validation libraries
          if (id.includes('zod') || id.includes('react-hook-form') || id.includes('@hookform')) {
            return 'schemas'
          }
          // Supabase client
          if (id.includes('@supabase')) {
            return 'supabase'
          }
          // i18next
          if (id.includes('i18next') || id.includes('react-i18next')) {
            return 'i18n'
          }
          // date-fns
          if (id.includes('date-fns')) {
            return 'date-fns'
          }
          // papaparse
          if (id.includes('papaparse')) {
            return 'papaparse'
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
