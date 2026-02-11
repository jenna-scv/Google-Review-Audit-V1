
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Setting the third parameter to '' loads all variables, not just those prefixed with VITE_
  // Fix: Replaced process.cwd() with '.' to avoid TypeScript error on 'process.cwd'
  const env = loadEnv(mode, '.', '');

  return {
    define: {
      // This maps the Vercel API_KEY to process.env.API_KEY in your code
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY),
    },
    build: {
      rollupOptions: {
        // Tell Vite/Rollup that these packages are provided by the browser (importmap)
        // and should not be searched for in node_modules or bundled.
        external: [
          'react',
          'react-dom',
          '@google/genai',
          'recharts',
          'lucide-react',
          'jspdf',
          'html2canvas',
          'jspdf-autotable'
        ],
      },
    },
    // Tell the compiler how to handle JSX since 'react' isn't in node_modules
    esbuild: {
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      // This ensures we can use JSX without a local react package
      jsx: 'transform',
    },
  };
});