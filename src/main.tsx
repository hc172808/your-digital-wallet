import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Dismiss splash screen after app renders
requestAnimationFrame(() => {
  const splash = document.getElementById("splash-screen");
  if (splash) {
    splash.classList.add("hide");
    setTimeout(() => splash.remove(), 600);
  }
});
