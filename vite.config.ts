
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // This makes the environment variable available in your app's code
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
  },
});
