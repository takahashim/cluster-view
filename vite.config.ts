import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";

export default defineConfig({
  plugins: [fresh()],
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress sourcemap warnings from @opentelemetry/api
        if (
          warning.message?.includes("sourcemap") &&
          warning.message?.includes("@opentelemetry")
        ) {
          return;
        }
        warn(warning);
      },
    },
  },
});
