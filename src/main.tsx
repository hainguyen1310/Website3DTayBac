import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource-variable/lora";
import "@fontsource-variable/lora/wght-italic.css";
import App from "./App";
import { AuthProvider } from "./AuthContext";
import { WebsiteProvider } from "./WebsiteContext";
import "./styles.css";
import "./store-expansion.css";
import "./moc-landing.css";
import "./moc-pages.css";
import "./brand-layout.css";
import "./admin.css";
import "./admin-operations.css";
import "./paper-transitions.css";
import "./storefront-motion.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <WebsiteProvider><App /></WebsiteProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
