import { useCallback, useEffect, useRef, useState } from "react";
import {
  GUIDED_SETUP_COMPLETE,
  GUIDED_SETUP_DISMISSED,
} from "../constants/storageKeys";

function readGuidanceComplete(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(GUIDED_SETUP_COMPLETE) === "1";
}

export function useGuidedSetup(settingsLoaded: boolean, hasPw: boolean | null) {
  const [guidedOpen, setGuidedOpen] = useState(false);
  const [guidedStep, setGuidedStep] = useState<0 | 1 | 2 | 3 | 4 | 5 | 6>(0);
  const [guidedWizardPassword, setGuidedWizardPassword] = useState("");
  const [guidedWizardPrivKey, setGuidedWizardPrivKey] = useState("");
  const [guidedConfigInstalled, setGuidedConfigInstalled] = useState(false);
  const [guidedPasswordSavedOk, setGuidedPasswordSavedOk] = useState(false);
  const [guidanceComplete, setGuidanceComplete] = useState(() =>
    readGuidanceComplete(),
  );
  const guidedAutoOpened = useRef(false);

  useEffect(() => {
    if (guidedAutoOpened.current) return;
    if (!settingsLoaded || hasPw === null) return;
    if (typeof localStorage === "undefined") return;
    if (localStorage.getItem(GUIDED_SETUP_COMPLETE) === "1") return;
    if (localStorage.getItem(GUIDED_SETUP_DISMISSED) === "1") return;
    guidedAutoOpened.current = true;
    setGuidedStep(0);
    setGuidedWizardPassword("");
    setGuidedWizardPrivKey("");
    setGuidedConfigInstalled(false);
    setGuidedPasswordSavedOk(false);
    setGuidedOpen(true);
  }, [settingsLoaded, hasPw]);

  useEffect(() => {
    if (!guidedOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGuidedOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [guidedOpen]);

  const openGuidedReset = useCallback(() => {
    setGuidedStep(0);
    setGuidedWizardPassword("");
    setGuidedWizardPrivKey("");
    setGuidedConfigInstalled(false);
    setGuidedPasswordSavedOk(false);
    setGuidedOpen(true);
  }, []);

  const dismissGuidedForLater = useCallback(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(GUIDED_SETUP_DISMISSED, "1");
    }
    setGuidedOpen(false);
  }, []);

  const markGuidanceComplete = useCallback(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(GUIDED_SETUP_COMPLETE, "1");
    }
    setGuidanceComplete(true);
  }, []);

  return {
    guidedOpen,
    setGuidedOpen,
    guidedStep,
    setGuidedStep,
    guidedWizardPassword,
    setGuidedWizardPassword,
    guidedWizardPrivKey,
    setGuidedWizardPrivKey,
    guidedConfigInstalled,
    setGuidedConfigInstalled,
    guidedPasswordSavedOk,
    setGuidedPasswordSavedOk,
    guidanceComplete,
    openGuidedReset,
    dismissGuidedForLater,
    markGuidanceComplete,
  };
}
