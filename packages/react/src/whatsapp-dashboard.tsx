"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { cn } from "./utils";

const MOBILE_BREAKPOINT = 1024; // matches `lg` in Tailwind

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };
    onChange(mql);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}

type MobileView = "list" | "chat";

interface WhatsappDashboardContextValue {
  isMobile: boolean;
  mobileView: MobileView;
  setMobileView: (view: MobileView) => void;
}

const WhatsappDashboardContext = createContext<WhatsappDashboardContextValue | null>(null);

export function useWhatsappDashboard() {
  const ctx = useContext(WhatsappDashboardContext);
  if (!ctx) {
    throw new Error("useWhatsappDashboard must be used within <WhatsappDashboard>");
  }
  return ctx;
}

interface WhatsappDashboardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  defaultMobileView?: MobileView;
}

export function WhatsappDashboard({
  children,
  className,
  defaultMobileView = "list",
  ...props
}: WhatsappDashboardProps) {
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<MobileView>(defaultMobileView);

  const handleSetMobileView = useCallback((view: MobileView) => {
    setMobileView(view);
  }, []);

  return (
    <WhatsappDashboardContext.Provider
      value={{ isMobile, mobileView, setMobileView: handleSetMobileView }}
    >
      <div
        className={cn(
          "bg-background flex h-full w-full overflow-hidden",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </WhatsappDashboardContext.Provider>
  );
}
