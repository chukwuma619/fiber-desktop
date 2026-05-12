import React from "react";
import ReactDOM from "react-dom/client";
import { LandingPage } from "./components/LandingPage";
import "./App.css";
import "./LandingPage.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <LandingPage />
  </React.StrictMode>,
);
