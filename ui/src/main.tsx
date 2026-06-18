import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./styles/app.css";
import "./styles/telegram.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
