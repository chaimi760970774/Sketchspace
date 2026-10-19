import { defineConfig } from 'vite';
import reactJsxPlugin from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => ({
    // GitHub Pages serves the site from /Sketchspace/; local dev stays at /
    base: command === 'build' && mode === 'production' ? '/Sketchspace/' : '/',
    plugins: [
        reactJsxPlugin(),
    ],
    server: {
        port: 8080,
        host: true,
        // Google's sign-in popup talks back to this page with postMessage; Google recommends this value
        headers: { 'Cross-Origin-Opener-Policy': 'same-origin-allow-popups' },
        proxy: {
            '/api': { target: 'http://localhost:3000', changeOrigin: true },
            '/socket.io': { target: 'http://localhost:3000', ws: true, changeOrigin: true },
        },
    },
    preview: {
        proxy: {
            '/api': { target: 'http://localhost:3000', changeOrigin: true },
            '/socket.io': { target: 'http://localhost:3000', ws: true, changeOrigin: true },
        },
    },
    build: {
        sourcemap: true,
        minify: false
    }
}));