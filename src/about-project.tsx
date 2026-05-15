import React from "react";
import ReactDOM from "react-dom/client";
import { AboutProjectPage } from "./components/guides/AboutProjectPage";
import "./App.css";
import "./LandingPage.css";
import "./HowItWorksPage.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AboutProjectPage />
  </React.StrictMode>,
);
