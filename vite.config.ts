import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/island/" : "/",
  build: {
    target: "es2022",
    sourcemap: true,
  },
}));
