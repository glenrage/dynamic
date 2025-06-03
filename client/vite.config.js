// client/vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load .env files based on mode (e.g., .env.development, .env.production)
  // The third argument '' ensures all env vars are loaded, not just VITE_ ones
  const env = loadEnv(mode, process.cwd(), ''); // process.cwd() should be 'client/'

  return {
    plugins: [react()],
    // Define makes these variables available globally in your client-side code.
    // Vite replaces these with their literal string values during the build.
    define: {
      'process.env.VITE_BACKEND_API_URL': JSON.stringify(
        env.VITE_BACKEND_API_URL
      ),
      'process.env.NODE_ENV': JSON.stringify(mode), // Good to define NODE_ENV too
      // Add any other env vars you want to expose via process.env
    },
  };
});
