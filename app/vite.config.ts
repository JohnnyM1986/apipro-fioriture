import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'img/brand/*'],
      manifest: {
        name: 'ApiPRO Fioriture',
        short_name: 'ApiPRO',
        description: 'Segnala e prevedi le fioriture di interesse apistico in Veneto',
        lang: 'it',
        theme_color: '#363d2d',
        background_color: '#faf7f1',
        display: 'standalone',
        start_url: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ],
  test: { environment: 'node' }
} as any)
