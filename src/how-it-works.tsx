import React from "react";
import ReactDOM from "react-dom/client";
import { HowItWorksPage } from "./components/HowItWorksPage";
import "./App.css";
import "./LandingPage.css";
import "./HowItWorksPage.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HowItWorksPage />
  </React.StrictMode>,
);
