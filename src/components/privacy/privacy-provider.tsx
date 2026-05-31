"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type PrivacyContextValue = {
  privacyMode: boolean;
  setPrivacyMode: (enabled: boolean) => void;
  togglePrivacyMode: () => void;
};

const PrivacyContext = createContext<PrivacyContextValue | null>(null);
const cookieName = "flowledger_privacy_mode";

export function PrivacyProvider({
  initialPrivacyMode = false,
  children,
}: {
  initialPrivacyMode?: boolean;
  children: ReactNode;
}) {
  const [privacyMode, setPrivacyModeState] = useState(initialPrivacyMode);

  const value = useMemo<PrivacyContextValue>(() => {
    function setPrivacyMode(enabled: boolean) {
      setPrivacyModeState(enabled);
      document.cookie = `${cookieName}=${enabled ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
    }

    return {
      privacyMode,
      setPrivacyMode,
      togglePrivacyMode: () => setPrivacyMode(!privacyMode),
    };
  }, [privacyMode]);

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacyMode() {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error("usePrivacyMode must be used within PrivacyProvider");
  }
  return context;
}
