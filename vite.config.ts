/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base` erlaubt die Auslieferung unter einem Unterpfad (z. B. GitHub Pages: /Wochenplaner-V-V/).
export default defineConfig({
  base: process.env.BASE_PATH ?? './',
  plugins: [react()],
  // Kiosk-App mit eingebetteten Rezeptdaten – ein Bundle ist hier bewusst in Ordnung.
  build: { chunkSizeWarningLimit: 900 },
  server: {
    // Der optionale Familienserver (Sync) läuft lokal unter /api.
    proxy: { '/api': 'http://localhost:8787' },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'server/**/*.test.mjs'],
    // Zeitzonen-Tests rechnen wie ein Gerät in Deutschland.
    env: { TZ: 'Europe/Berlin' },
  },
});
