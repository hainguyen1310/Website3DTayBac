import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource-variable/lora";
import "@fontsource-variable/lora/wght-italic.css";
import "@fontsource-variable/cormorant-garamond";
import "@fontsource-variable/cormorant-garamond/wght-italic.css";
import App from "./App";
import { initAnalytics } from "./analytics";
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
import "./asin-theme.css";
import "./asin-story.css";
import "./asin-experience.css";
import "./asin-lower.css";
import "./asin-typography.css";
import "./asin-pages.css";

// GA4 sẵn sàng trước khi trang con gửi sự kiện; tự tắt ở admin/preview/localhost.
initAnalytics();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <WebsiteProvider><App /></WebsiteProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
