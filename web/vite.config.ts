import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // One shared project-root .env for web + API. Only VITE_* keys are exposed to
  // browser code by Vite, so database credentials remain server-only.
  envDir: '..',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
});
