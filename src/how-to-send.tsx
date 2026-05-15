import React from "react";
import ReactDOM from "react-dom/client";
import { HowToSendPage } from "./components/guides/HowToSendPage";
import "./App.css";
import "./LandingPage.css";
import "./HowItWorksPage.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HowToSendPage />
  </React.StrictMode>,
);
