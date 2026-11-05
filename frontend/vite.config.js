import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
// The browser only ever talks to same-origin relative URLs (/api/...).
// In dev/preview, Vite proxies /api to the backend. By default that is the local
// demo API (:8090); point VITE_API_TARGET at the Spring Boot backend (:8081) to
// run against the real thing. No localhost URLs are ever shipped to the browser.
var API_TARGET = process.env.VITE_API_TARGET || 'http://localhost:8090';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: { '@': path.resolve(__dirname, 'src') },
    },
    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        // Allow the Arena/E2B preview host (and any reverse-proxy hostname).
        allowedHosts: true,
        proxy: {
            '/api': {
                target: API_TARGET,
                changeOrigin: true,
                rewrite: function (p) { return p.replace(/^\/api/, ''); },
            },
        },
    },
    preview: {
        host: '0.0.0.0',
        port: 4173,
        allowedHosts: true,
    },
    build: {
        target: 'es2020',
        sourcemap: false,
        chunkSizeWarningLimit: 900,
    },
});
