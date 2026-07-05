import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // All data comes via the thin server so tokens never reach the browser.
      "/api": "http://127.0.0.1:4400",
    },
  },
});
