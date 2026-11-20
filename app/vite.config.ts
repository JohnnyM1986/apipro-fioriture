import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'ApiPRO Fioriture',
        short_name: 'ApiPRO',
        description: 'Segnala e prevedi le fioriture di interesse apistico in Veneto',
        lang: 'it',
        theme_color: '#2f6b3a',
        background_color: '#fbf8f1',
        display: 'standalone',
        start_url: './',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
      }
    })
  ],
  test: { environment: 'node' }
} as any)
