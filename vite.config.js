import react from "@vitejs/plugin-react";
import { defineConfig } from 'vitest/config'

/**
 * @type {import('vite').UserConfig}
 */
module.exports = defineConfig({
    plugins: [react()],
    build: {
        minify: false
    },
    test: {
        includeSource: ['{lib,app}/**/*.{js,ts}'],
    }
})
