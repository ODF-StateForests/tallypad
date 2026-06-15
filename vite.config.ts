import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import Icons from 'unplugin-icons/vite'
import Components from 'unplugin-vue-components/vite'
import IconsResolver from 'unplugin-icons/resolver'

export default defineConfig(() => {
  // Using a trailing slash for the base path ensures proper PWA scoping on GitHub Pages
  const root = '';

  return {
    base: root,
    plugins: [
      vue(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'Tallypad Forest Inventory',
          short_name: 'Tallypad',
          description: 'Forest inventory and tree measurement application.',
          theme_color: '#2563eb',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
        }
      }),
      // 1. Automatically registers icons as components
      Components({
        resolvers: [
          IconsResolver({
            // Changes the component prefix (default is 'i')
            prefix: 'icon', 
          }),
        ],
      }),
      // 2. Compiles Iconify data into Vue components
      Icons({
        autoInstall: true, // Automatically fetches icon packages on-demand
      })
    ],
  };
});
