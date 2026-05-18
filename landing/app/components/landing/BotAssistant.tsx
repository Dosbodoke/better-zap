"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Image from "next/image";
import { useTranslations } from "next-intl";

gsap.registerPlugin(useGSAP);

export function BotAssistant() {
  const t = useTranslations("assistant");
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const robot = rootRef.current?.querySelector<HTMLElement>(
        "[data-assistant-robot]",
      );
      const balloon = rootRef.current?.querySelector<HTMLElement>(
        "[data-assistant-balloon]",
      );
      const tail =
        rootRef.current?.querySelector<HTMLElement>("[data-assistant-tail]");
      const mm = gsap.matchMedia();

      if (!robot || !balloon || !tail) {
        return;
      }

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set([robot, balloon, tail], {
          autoAlpha: 1,
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          clearProps: "transform",
        });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const intro = gsap.timeline({
          defaults: { ease: "power3.out" },
          delay: 0.65,
        });

        intro
          .fromTo(
            robot,
            { autoAlpha: 0, y: 34, scale: 0.84, rotation: 4 },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              rotation: 0,
              duration: 0.85,
              ease: "back.out(1.35)",
            },
            0,
          )
          .fromTo(
            balloon,
            { autoAlpha: 0, y: 16, x: 10, scale: 0.86 },
            {
              autoAlpha: 1,
              y: 0,
              x: 0,
              scale: 1,
              duration: 0.55,
              ease: "back.out(1.7)",
            },
            0.34,
          )
          .fromTo(
            tail,
            { autoAlpha: 0, scale: 0.35 },
            { autoAlpha: 1, scale: 1, duration: 0.28 },
            0.5,
          )
          .to(
            robot,
            {
              y: -7,
              duration: 2.2,
              ease: "sine.inOut",
              repeat: -1,
              yoyo: true,
            },
            1.1,
          )
          .to(
            balloon,
            {
              y: -4,
              duration: 2.2,
              ease: "sine.inOut",
              repeat: -1,
              yoyo: true,
            },
            1.2,
          );
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <aside
      ref={rootRef}
      aria-label={t("label")}
      className="pointer-events-none fixed bottom-4 right-3 z-50 flex items-end gap-2 sm:bottom-6 sm:right-6 sm:gap-3"
    >
      <div
        data-assistant-balloon
        className="relative mb-16 max-w-[11.5rem] rounded-[1.35rem] border border-zinc-900/10 bg-white px-4 py-3 text-sm font-semibold leading-snug text-zinc-900 opacity-0 shadow-[0_18px_48px_rgba(15,23,42,0.16)] sm:mb-20 sm:max-w-[13.5rem]"
      >
        <span>{t("message")}</span>
        <span
          data-assistant-tail
          className="absolute -bottom-2 right-7 h-5 w-5 rotate-45 rounded-[0.25rem] border-b border-r border-zinc-900/10 bg-white opacity-0"
        />
      </div>

      <div
        data-assistant-robot
        className="relative h-24 w-24 shrink-0 opacity-0 drop-shadow-[0_20px_28px_rgba(15,23,42,0.22)] sm:h-32 sm:w-32"
      >
        <Image
          src="/assets/better-zap-robot-transparent.png"
          alt={t("imageAlt")}
          width={180}
          height={180}
          sizes="(min-width: 640px) 128px, 96px"
          className="h-full w-full object-contain"
        />
      </div>
    </aside>
  );
}
