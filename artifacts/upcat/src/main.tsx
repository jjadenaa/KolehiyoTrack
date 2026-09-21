import { createRoot } from "react-dom/client";
import "katex/dist/katex.min.css";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

// Global uncaught error listener to ensure a blank white screen is never left unexplained
if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    console.error("Global uncaught error:", event.error || event.message);
  });
  window.addEventListener("unhandledrejection", (event) => {
    console.error("Global unhandled rejection:", event.reason);
  });
}

try {
  const rootElement = document.getElementById("root");
  if (rootElement) {
    createRoot(rootElement).render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
  }
} catch (err: any) {
  console.error("Fatal initialization error:", err);
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a;">
        <div style="max-width:440px;width:100%;padding:24px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);text-align:center;">
          <div style="width:48px;height:48px;border-radius:50%;background:#fee2e2;color:#dc2626;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:20px;font-weight:bold;">!</div>
          <h1 style="font-size:18px;font-weight:bold;margin-bottom:8px;">App Loading Issue</h1>
          <p style="font-size:14px;color:#64748b;margin-bottom:20px;">${(err && err.message) || "An unexpected error prevented the app from loading."}</p>
          <button onclick="localStorage.clear();window.location.reload();" style="width:100%;padding:10px 16px;background:#7b1113;color:#ffffff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Clear Cache & Reload</button>
        </div>
      </div>
    `;
  }
}

