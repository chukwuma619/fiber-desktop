import React from "react";
import ReactDOM from "react-dom/client";
import { HowToReceivePage } from "./components/guides/HowToReceivePage";
import "./App.css";
import "./LandingPage.css";
import "./HowItWorksPage.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HowToReceivePage />
  </React.StrictMode>,
);
