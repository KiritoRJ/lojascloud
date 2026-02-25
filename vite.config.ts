import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const appUrl = env.APP_URL || '/';

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {},
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          strategies: 'injectManifest',
          srcDir: 'public',
          filename: 'sw.js',
          injectManifest: {
            injectionPoint: undefined
          },
          manifest: {
            name: 'Assistência Técnica Pro',
            short_name: 'Assistência Pro',
            description: 'Sistema de Gestão para Assistência Técnica Profissional',
            theme_color: '#2563eb',
            background_color: '#ffffff',
            display: 'standalone',
            orientation: 'portrait',
            start_url: '/',
            scope: '/',
            id: '/',
            icons: [
              {
                src: 'icon.svg',
                sizes: '192x192',
                type: 'image/svg+xml',
                purpose: 'any'
              },
              {
                src: 'icon.svg',
                sizes: '512x512',
                type: 'image/svg+xml',
                purpose: 'any'
              },
              {
                src: 'icon.svg',
                sizes: '512x512',
                type: 'image/svg+xml',
                purpose: 'maskable'
              }
            ]
          },
          devOptions: {
            enabled: true,
            type: 'module',
            navigateFallback: appUrl + 'index.html',
          }
        })
      ],

      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
