import { defineConfig } from "vite";
import { resolve } from "path";
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    css: {
        preprocessorOptions: {
            scss: {
                loadPaths: [resolve(__dirname, "src/styles")],
            },
        },
    },

    build: {
        rollupOptions: {
            input: {
                Start: resolve(__dirname, "index.html"),
                SunSeeker: resolve(__dirname, "sun.html"),
                Theme: resolve(__dirname, "theme.html")
            },
        },
    },

    plugins: [
        VitePWA({
            injectRegister: "auto",
            registerType: "autoUpdate",
            manifest: {
                name: "VanTrail",
                short_name: "VanTrail",
                description: "Roadtrip och vanlife-planering",
                theme_color: "#ffffff",
                background_color: "#ffffff",
                display: "standalone",
                start_url: "/",
                scope: "/",
                id: "/",
                icons: [
                    {
                        src: "/pwa-192x192.png",
                        sizes: "192x192",
                        type: "image/png",
                        purpose: 'any'
                    },
                    {
                        src: "/pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: 'any'
                    },
                    {
                        src: "/pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "maskable",
                    },
                ],
            },
        }),
    ],
});