import type { Config } from "tailwindcss";
import daisyui from "daisyui";

export default {
  content: [
    "./routes/**/*.{tsx,ts}",
    "./islands/**/*.{tsx,ts}",
    "./components/**/*.{tsx,ts}",
  ],
  theme: {
    extend: {},
  },
  // deno-lint-ignore no-explicit-any
  plugins: [daisyui as any],
  daisyui: {
    themes: ["autumn", "business"],
  },
} satisfies Config;
