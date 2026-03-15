import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { initTheme } from "./store/themeStore";
import "./styles/index.css";

initTheme();
createRoot(document.getElementById("root")!).render(<App />);
  