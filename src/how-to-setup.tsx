import React from "react";
import ReactDOM from "react-dom/client";
import { HowToSetupPage } from "./components/guides/HowToSetupPage";
import "./App.css";
import "./LandingPage.css";
import "./HowItWorksPage.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HowToSetupPage />
  </React.StrictMode>,
);
