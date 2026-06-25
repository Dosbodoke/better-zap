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
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { isDesktop, reduceMotion } = context.conditions ?? {};
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
          const allTargets = [...desktopIntro, ...revealTargets];

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
              defaults: { duration: 0.7, ease: "power3.out" },
            });

            if (desktopIntro.length > 0) {
              introTimeline
                .addLabel("content", 0.34)
                .fromTo(
                  desktopIntro,
                  { autoAlpha: 0, y: 22 },
                  {
                    autoAlpha: 1,
                    y: 0,
                    stagger: 0.1,
                    clearProps: "transform",
                  },
                  "content",
                );
            }
          }

          if (revealTargets.length > 0) {
            gsap.set(revealTargets, {
              autoAlpha: 0,
              y: isDesktop ? 28 : 18,
              scale: isDesktop ? 0.985 : 1,
              transformOrigin: "50% 20%",
            });

            ScrollTrigger.batch(revealTargets, {
              scroller: isDesktop ? (scrollContainer ?? undefined) : undefined,
              start: "clamp(top 88%)",
              once: true,
              interval: 0.08,
              batchMax: isDesktop ? 2 : 1,
              onEnter: (batch) => {
                gsap.to(batch, {
                  autoAlpha: 1,
                  y: 0,
                  scale: 1,
                  duration: 0.68,
                  stagger: 0.1,
                  ease: "power3.out",
                  overwrite: "auto",
                  clearProps: "transform",
                });
              },
            });
          }
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
