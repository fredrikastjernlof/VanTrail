import { defineConfig } from "vite";
import { resolve } from "path";

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
});