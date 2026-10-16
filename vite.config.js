import { defineConfig } from 'vite';
import reactJsxPlugin from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        reactJsxPlugin(),
    ],
    server: {
        port: 8080,
        host: true,
        proxy: {
            '/api': { target: 'http://localhost:3000', changeOrigin: true },
            '/socket.io': { target: 'http://localhost:3000', ws: true, changeOrigin: true },
        },
    },
    build: {
        sourcemap: true,
        minify: false
    }
});