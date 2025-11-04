import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from 'path';

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  define: {
    'module.exports': '{}',
  },
  server: {
    hmr: {
      timeout: 300000,   // 5 minutes timeout
      overlay: false     // Disable error overlay to prevent issues
    },
    // Reduce chokidar work on Windows: ignore heavy folders not needed for FE
    watch: {
      ignored: [
        "**/backend/**",
        "**/node_modules/**",
        "**/dist/**",
        "**/.git/**"
      ],
      usePolling: false
    }
  },
  ssr: {
    // Add optimizations for SSR
    noExternal: ['framer-motion', 'lucide-react', '@headlessui/react']
  },
  optimizeDeps: {
    // Prebundle common deps to reduce request count in dev
    include: [
      'react',
      'react-dom',
      'react-router',
      'framer-motion',
      'lucide-react',
      '@headlessui/react'
    ],
    // Avoid scanning very large optional libs in dev
    exclude: [
      'firebase',
      '@firebase/*',
      '@tensorflow/tfjs',
      '@tensorflow-models/coco-ssd',
      '@tensorflow-models/mobilenet'
    ]
  },
  resolve: {
    alias: {
      // Fix for 'long.js' issue with some packages that are not ESM-compatible.
      // This ensures that any import of 'long' resolves to the correct file.
      'long': path.resolve(__dirname, 'node_modules/long/index.js'),
    },
  },
});
