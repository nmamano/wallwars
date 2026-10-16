import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "./",
  envPrefix: ["VITE_", "REACT_APP_"],
  build: {
    outDir: "build",
  },
});
