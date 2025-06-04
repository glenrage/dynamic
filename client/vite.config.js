import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // In Vercel's build environment, Vercel's own env vars should directly populate process.env
  const backendApiUrl =
    process.env.VITE_BACKEND_API_URL || env.VITE_BACKEND_API_URL;
  console.log(`[VITE_CONFIG] Mode: ${mode}`);
  console.log(
    `[VITE_CONFIG] VITE_BACKEND_API_URL from Vercel/process.env: ${process.env.VITE_BACKEND_API_URL}`
  );
  console.log(
    `[VITE_CONFIG] VITE_BACKEND_API_URL from loadEnv: ${env.VITE_BACKEND_API_URL}`
  );
  console.log(
    `[VITE_CONFIG] Effective VITE_BACKEND_API_URL for define: ${backendApiUrl}`
  );

  return {
    plugins: [react()],
    define: {
      'process.env.VITE_BACKEND_API_URL': JSON.stringify(backendApiUrl), // Use the resolved URL
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
  };
});
