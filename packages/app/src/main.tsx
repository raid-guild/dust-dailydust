import "./index.css";
import "@fontsource/press-start-2p/400.css";
import "@fontsource/im-fell-english-sc/400.css";
import "@fontsource/spectral/400.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "@/App.tsx";
import { Providers } from "@/common/Providers.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>
);
