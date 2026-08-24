import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

const style = document.createElement("style");
style.textContent = `
  html, body, #root { min-height: 100%; margin: 0; }
  body { background: #10161d; }
  button, input, select { font: inherit; }
`;
document.head.appendChild(style);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
