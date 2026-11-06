import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['brand/logo-mark.svg'],
      manifest: {
        name: 'ASCEND by Altitude',
        short_name: 'ASCEND',
        description: 'Order ahead at Altitude and climb the tiers.',
        theme_color: '#14110F',
        background_color: '#0B0908',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        globIgnores: ['**/three-*.js'],
        navigateFallback: '/index.html',
        // Order and auth API calls go to Supabase on another origin and are never cached.
        runtimeCaching: [],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules[\\/](three|@react-three)/.test(id)) return 'three';
          return undefined;
        },
      },
    },
  },
});
