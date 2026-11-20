import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { PaletteProvider } from "./theme/PaletteContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PaletteProvider>
      <App />
    </PaletteProvider>
  </StrictMode>,
);
