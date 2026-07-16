import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';

export default defineConfig({
  plugins: [react(), cesium()],
  server: {
    port: 5173,
    // Proxy API + websocket traffic to the backend so the browser only
    // ever talks to the Vite origin. This makes the app work unchanged
    // behind forwarded ports (GitHub Codespaces, remote containers...)
    // where localhost:4000 isn't reachable from the user's browser, and
    // sidesteps CORS entirely in development.
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:4000', ws: true },
    },
  },
});
