"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function LandingAnimations({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;

      if (!root) {
        return;
      }

      const mm = gsap.matchMedia();

      mm.add(
        {
          isDesktop: "(min-width: 1024px)",
          isMobile: "(max-width: 1023px)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { isDesktop, reduceMotion } = context.conditions ?? {};
          const heroShell = root.querySelector<HTMLElement>("[data-hero-shell]");
          const desktopIntro = gsap.utils.toArray<HTMLElement>(
            "[data-desktop-intro]",
            root,
          );
          const scrollContainer = root.querySelector<HTMLElement>(
            "[data-landing-scroll-container]",
          );
          const revealTargets = gsap.utils.toArray<HTMLElement>(
            isDesktop
              ? "[data-scroll-reveal]:not([data-desktop-intro])"
              : "[data-scroll-reveal]",
            root,
          );
          const allTargets = [
            ...(heroShell ? [heroShell] : []),
            ...desktopIntro,
            ...revealTargets,
          ];

          if (reduceMotion) {
            gsap.set(allTargets, {
              autoAlpha: 1,
              x: 0,
              y: 0,
              scale: 1,
              clearProps: "transform",
            });
            return;
          }

          if (isDesktop) {
            const introTimeline = gsap.timeline({
              defaults: { duration: 0.85, ease: "power3.out" },
            });

            if (heroShell) {
              introTimeline.fromTo(
                heroShell,
                { autoAlpha: 0, x: 18, scale: 0.985 },
                { autoAlpha: 1, x: 0, scale: 1, duration: 1 },
                0,
              );
            }

            if (desktopIntro.length > 0) {
              introTimeline.fromTo(
                desktopIntro,
                { autoAlpha: 0, y: 18 },
                { autoAlpha: 1, y: 0, stagger: 0.12 },
                0.08,
              );
            }
          } else if (heroShell) {
            gsap.fromTo(
              heroShell,
              { autoAlpha: 0, y: 18, scale: 0.985 },
              { autoAlpha: 1, y: 0, scale: 1, duration: 0.9, ease: "power3.out" },
            );
          }

          if (revealTargets.length > 0) {
            gsap.set(revealTargets, { autoAlpha: 0, y: 28 });

            ScrollTrigger.batch(revealTargets, {
              scroller: isDesktop ? scrollContainer ?? undefined : undefined,
              start: "top 84%",
              once: true,
              onEnter: (batch) => {
                gsap.to(batch, {
                  autoAlpha: 1,
                  y: 0,
                  duration: 0.75,
                  stagger: 0.08,
                  ease: "power3.out",
                  overwrite: true,
                });
              },
            });
          }

          ScrollTrigger.refresh();
        },
      );

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className="h-full">
      {children}
    </div>
  );
}
