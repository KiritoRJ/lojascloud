import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
          manifest: {
            name: 'Assistência Técnica Pro',
            short_name: 'Assistência Pro',
            description: 'Sistema de Gestão para Assistência Técnica',
            theme_color: '#2563eb',
            background_color: '#2563eb',
            display: 'standalone',
            orientation: 'portrait',
            icons: [
              {
                src: 'https://cdn-icons-png.flaticon.com/512/7075/7075336.png',
                sizes: '64x64',
                type: 'image/png'
              },
              {
                src: 'https://cdn-icons-png.flaticon.com/512/7075/7075336.png',
                sizes: '128x128',
                type: 'image/png'
              },
              {
                src: 'https://cdn-icons-png.flaticon.com/512/7075/7075336.png',
                sizes: '144x144',
                type: 'image/png'
              },
              {
                src: 'https://cdn-icons-png.flaticon.com/512/7075/7075336.png',
                sizes: '152x152',
                type: 'image/png'
              },
              {
                src: 'https://cdn-icons-png.flaticon.com/512/7075/7075336.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: 'https://cdn-icons-png.flaticon.com/512/7075/7075336.png',
                sizes: '384x384',
                type: 'image/png'
              },
              {
                src: 'https://cdn-icons-png.flaticon.com/512/7075/7075336.png',
                sizes: '512x512',
                type: 'image/png'
              },
              {
                src: 'https://cdn-icons-png.flaticon.com/512/7075/7075336.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable'
              }
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
