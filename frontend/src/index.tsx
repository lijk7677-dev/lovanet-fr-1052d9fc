import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";
import { initTilt3D } from "./lib/tilt3d";
// ✨ Thème par défaut : Menthe Vibrant Cyber - Updated 2026-08-11
import { initInteractivity } from "./lib/interactivity";

initTilt3D();
initInteractivity();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((error) => {
      console.warn('SW registration failed: ', error);
    });
  });
}

