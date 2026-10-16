import { defineConfig } from 'vite';
import reactJsxPlugin from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
    // GitHub Pages serves the site from /Sketchspace/; local dev stays at /
    base: command === 'build' ? '/Sketchspace/' : '/',
    plugins: [
        reactJsxPlugin(),
    ],
    server: {
        port: 8080,
        // Google's sign-in popup talks back to this page with postMessage; Google recommends this value
        headers: { 'Cross-Origin-Opener-Policy': 'same-origin-allow-popups' },
    },
    build: {
        sourcemap: true,
        minify: false
    }
}));