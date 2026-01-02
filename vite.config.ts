import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default {
  build: {
    sourcemap: true, // Enable source maps for production
  },
  esbuild: {
    sourcemap: 'inline', // Enable source maps for development
  },
};