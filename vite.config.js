import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Relative base so the built bundle can be served from any sub-path — or straight
// off a USB stick at the exhibition, which is the failure mode we actually care about.
//
// Two entries: the 3D walkthrough (index.html) and the online shop (shop.html).
// They share the brand tokens, the WARREN face and the age gate, but the shop
// deliberately does NOT pull in three.js — a visitor who only wants to buy tea
// shouldn't download a renderer.
export default defineConfig({
  base: './',
  server: { port: 5173 },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        shop: resolve(__dirname, 'shop.html'),
      },
    },
  },
});
