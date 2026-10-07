```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

const useHttps = process.env.HTTPS === "true";

export default defineConfig({
  plugins: [
    ...(useHttps ? [basicSsl()] : []),

    tailwindcss(),

    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),

    tanstackStart({
      server: {
        entry: "server",
      },
    }),

    nitro(),

    react(),
  ],

  resolve: {
    alias: {
      "@": `${process.cwd()}/src`,
    },

    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },

  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],

    ignoreOutdatedRequests: true,
  },

  server: {
    host: "::",
    port: 8080,
  },

  css: {
    transformer: "lightningcss",
  },
});
```
