"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { cn } from "./utils";

const MOBILE_BREAKPOINT = 1024; // matches `lg` in Tailwind

function useIsMobile(enabled = true) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };
    onChange(mql);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [enabled]);

  return isMobile;
}

export type MobileView = "list" | "chat";

export interface WhatsappDashboardContextValue {
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

/** Returns the dashboard context, or null when rendered outside <WhatsappDashboard>. */
export function useOptionalWhatsappDashboard(): WhatsappDashboardContextValue | null {
  return useContext(WhatsappDashboardContext);
}

export interface WhatsappDashboardProps extends React.ComponentProps<"div"> {
  children: React.ReactNode;
  defaultMobileView?: MobileView;
  /** Controlled mobile navigation view. When set, local state is not updated. */
  mobileView?: MobileView;
  onMobileViewChange?: (view: MobileView) => void;
  /** Override media-query detection (e.g. app-owned responsive state). */
  isMobile?: boolean;
}

export function WhatsappDashboard({
  children,
  className,
  defaultMobileView = "list",
  mobileView: mobileViewProp,
  onMobileViewChange,
  isMobile: isMobileProp,
  ...props
}: WhatsappDashboardProps) {
  const detectedIsMobile = useIsMobile(isMobileProp === undefined);
  const isMobile = isMobileProp ?? detectedIsMobile;

  const [uncontrolledView, setUncontrolledView] =
    useState<MobileView>(defaultMobileView);
  const isViewControlled = mobileViewProp !== undefined;
  const mobileView = isViewControlled ? mobileViewProp : uncontrolledView;

  const setMobileView = useCallback(
    (view: MobileView) => {
      if (!isViewControlled) {
        setUncontrolledView(view);
      }
      onMobileViewChange?.(view);
    },
    [isViewControlled, onMobileViewChange],
  );

  const value = useMemo(
    () => ({ isMobile, mobileView, setMobileView }),
    [isMobile, mobileView, setMobileView],
  );

  return (
    <WhatsappDashboardContext.Provider value={value}>
      <div
        className={cn(
          "flex h-full w-full overflow-hidden bg-[#f0f2f5]",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </WhatsappDashboardContext.Provider>
  );
}
