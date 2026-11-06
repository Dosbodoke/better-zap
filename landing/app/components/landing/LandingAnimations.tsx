"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { onHeroIntroStart } from "./heroIntro";

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

          if (!isDesktop || reduceMotion) {
            gsap.set(allTargets, {
              autoAlpha: 1,
              x: 0,
              y: 0,
              scale: 1,
              clearProps: "transform",
            });
            return;
          }

          // Support for the hero: the right column picks up as the hero's
          // CTAs land. Gaps shrink and travel drops item by item.
          const introTimeline = gsap.timeline({
            paused: true,
            defaults: { ease: "power3.out" },
          });
          const [header, bullets, installation] = desktopIntro;
          const introBeats = [
            { target: header, at: 0, y: 20, duration: 0.6 },
            { target: bullets, at: 0.1, y: 14, duration: 0.5 },
            { target: installation, at: 0.18, y: 10, duration: 0.5 },
          ];

          introTimeline.addLabel("content", 0.46);

          for (const { target, at, y, duration } of introBeats) {
            if (!target) {
              continue;
            }

            introTimeline.fromTo(
              target,
              { autoAlpha: 0, y },
              { autoAlpha: 1, y: 0, duration, clearProps: "transform" },
              `content+=${at}`,
            );
          }

          // Reveals already in view at load join the end of the intro wave
          // instead of jumping ahead of it.
          introTimeline.addLabel("introTail", "content+=0.26");
          const introTail = introTimeline.labels.introTail;

          const stopWaitingForHero = onHeroIntroStart((fromFallback) => {
            // Without the hero there's nothing to follow, so skip the lead-in.
            introTimeline.play(fromFallback ? "content" : 0);
          });

          if (revealTargets.length > 0) {
            gsap.set(revealTargets, {
              autoAlpha: 0,
              y: 28,
              scale: 0.985,
              transformOrigin: "50% 20%",
            });

            ScrollTrigger.batch(revealTargets, {
              scroller: scrollContainer ?? undefined,
              start: "clamp(top 88%)",
              once: true,
              interval: 0.08,
              batchMax: 2,
              onEnter: (batch) => {
                const reveal = {
                  autoAlpha: 1,
                  y: 0,
                  scale: 1,
                  duration: 0.68,
                  stagger: 0.1,
                  ease: "power3.out",
                  overwrite: "auto" as const,
                  clearProps: "transform",
                };

                if (introTimeline.time() < introTail) {
                  introTimeline.to(batch, reveal, introTail);
                  return;
                }

                gsap.to(batch, reveal);
              },
            });
          }

          return stopWaitingForHero;
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
