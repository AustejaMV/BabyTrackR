import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { PremiumProvider } from "./app/contexts/PremiumContext";
import { initTheme } from "./store/themeStore";
import "./styles/index.css";

initTheme();

// Apply accessibility preferences from localStorage so theme/UI can respond
try {
  const scale = localStorage.getItem("cradl-larger-text");
  if (scale != null) document.documentElement.setAttribute("data-font-scale", scale);
  const hc = localStorage.getItem("cradl-high-contrast");
  document.documentElement.setAttribute("data-high-contrast", hc === "true" ? "true" : "false");
} catch {}
createRoot(document.getElementById("root")!).render(
  <PremiumProvider>
    <App />
  </PremiumProvider>
);
  