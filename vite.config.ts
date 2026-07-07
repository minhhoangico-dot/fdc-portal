import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const bridgeTarget = (env.VITE_BRIDGE_URL || 'http://localhost:3333').replace(/\/$/, '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon-192.png'],
        manifest: {
          name: 'FDC Portal — Phòng khám Gia Đình',
          short_name: 'FDC Portal',
          description: 'Hệ thống quản lý phê duyệt và vận hành Phòng khám Gia Đình',
          theme_color: '#0B7A5C',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          importScripts: ['/sw-push.js'],
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          globIgnores: ['**/xlsx-*.js'],
          maximumFileSizeToCacheInBytes: 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-api',
                expiration: { maxEntries: 50, maxAgeSeconds: 300 },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api/bridge': {
          target: bridgeTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (requestPath) => requestPath.replace(/^\/api\/bridge/, ''),
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            supabase: ['@supabase/supabase-js'],
            charts: ['recharts'],
            icons: ['lucide-react'],
          },
        },
      },
    },
  };
});
