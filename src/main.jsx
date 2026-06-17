import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import JouleDashboard from "./joule-dashboard.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <JouleDashboard />
  </StrictMode>
);
