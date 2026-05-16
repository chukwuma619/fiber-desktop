import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { AboutProjectPage } from "./components/guides/AboutProjectPage";
import { GuidesIndexPage } from "./components/guides/GuidesIndexPage";
import { HowToReceivePage } from "./components/guides/HowToReceivePage";
import { HowToSendPage } from "./components/guides/HowToSendPage";
import { HowToSetupPage } from "./components/guides/HowToSetupPage";
import { DownloadPage } from "./components/DownloadPage";
import { LandingPage } from "./components/LandingPage";
import { SiteNavbar } from "./components/SiteNavbar";
import "./fiber-desktop-theme.css";
import "./LandingPage.css";
import "./HowItWorksPage.css";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <SiteNavbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/download" element={<DownloadPage />} />
        <Route path="/how-it-works" element={<GuidesIndexPage />} />
        <Route path="/how-to-send" element={<HowToSendPage />} />
        <Route path="/how-to-receive" element={<HowToReceivePage />} />
        <Route path="/how-to-setup" element={<HowToSetupPage />} />
        <Route path="/about-project" element={<AboutProjectPage />} />
      </Routes>
    </>
  );
}
