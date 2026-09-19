import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Where the app is served from.
//   '/'           — local dev, Vercel, Netlify, any root domain
//   '/learncode/' — GitHub Pages, which serves a project site from a subpath
// The deploy workflow sets BASE_PATH; everything else gets the root.
const base = process.env.BASE_PATH ?? '/'

// The app ships as a PWA so it can be installed as a real app:
//   iPhone  -> Safari -> Share -> "Add to Home Screen"
//   Windows -> Edge/Chrome -> install icon in the address bar
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'icons/apple-touch-icon-180.png',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/icon-maskable-512.png',
      ],
      manifest: {
        // Must match where the app is actually served, or the install prompt
        // never appears and the installed app opens on the wrong URL.
        id: base,
        name: 'LearnCode — Python, HTML & C++',
        short_name: 'LearnCode',
        description:
          'Learn Python, HTML and C++ (plus an OpenGL track) from absolute zero. Read, study a sample, answer a question — progress saves as you go.',
        theme_color: '#0b1020',
        background_color: '#0b1020',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: base,
        start_url: base,
        categories: ['education', 'developer', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Lesson content is bundled into the JS, so the whole course works offline.
        navigateFallback: `${base}index.html`,
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            // Never cache Supabase auth/data calls — they must hit the network.
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    // The whole course is bundled on purpose — it is what makes every lesson
    // work offline once the service worker has cached it. Splitting it per
    // track lets the browser fetch them in parallel, and means editing one
    // track only invalidates that chunk for returning visitors.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/src/content/python/')) return 'course-python'
          if (id.includes('/src/content/html/')) return 'course-html'
          if (id.includes('/src/content/cpp-gl/')) return 'course-cpp-gl'
          if (id.includes('/src/content/cpp/')) return 'course-cpp'
          if (id.includes('/node_modules/@supabase/')) return 'supabase'
          if (id.includes('/node_modules/')) return 'vendor'
          return undefined
        },
      },
    },
  },
})
