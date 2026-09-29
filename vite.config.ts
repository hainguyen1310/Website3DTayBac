import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { nodeHandler } from "./server/http";
import { contactReply } from "./server/email/reply";
import { mailSync } from "./server/email/sync";
import { staffInvite } from "./server/staff-invite";
import { seoPlugin } from "./server/seo/dev";
import { getSeoEnvironment } from "./src/seo/config";

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), "");
  // Only VITE_ variables are exposed to the browser. Secrets stay in this Node process.
  for (const [key, value] of Object.entries(environment))
    if (!key.startsWith("VITE_") && process.env[key] === undefined)
      process.env[key] = value;
  // Renderer cần cả biến VITE_ (Supabase URL/key công khai) khi chạy dev middleware.
  const seoEnv = getSeoEnvironment({ ...process.env, ...environment });
  return {
    plugins: [
      react(),
      seoPlugin(seoEnv),
      {
        name: "asin-local-api",
        configureServer(server) {
          server.middlewares.use(
            "/api/contact-reply",
            nodeHandler(contactReply),
          );
          server.middlewares.use("/api/mail-sync", nodeHandler(mailSync));
          server.middlewares.use("/api/staff-invite", nodeHandler(staffInvite));
        },
      },
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            supabase: ["@supabase/supabase-js"],
            icons: ["lucide-react"],
          },
        },
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      watch: {
        ignored: ["**/public/preview/**"],
      },
    },
  };
});
