import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
// Phông của khu quản trị và hộp hỗ trợ; phông cửa hàng nằm trong src/site/styles.
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import App from "./App";
import { initAnalytics } from "./analytics";
import { WebsiteProvider } from "./WebsiteContext";

// GA4 sẵn sàng trước khi trang con gửi sự kiện; tự tắt ở admin/preview/localhost.
initAnalytics();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <WebsiteProvider><App /></WebsiteProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
