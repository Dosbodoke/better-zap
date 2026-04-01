"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";

const rotatingWords = [
  "Usa sua Business Account",
  "Usa sua infraestrutura",
  "É dono do seus dados",
];

export function HeroTitle() {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((i) => (i + 1) % rotatingWords.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative z-[2] w-full py-16 flex flex-col justify-center items-start lg:items-center lg:justify-end lg:pb-28 min-h-dvh lg:min-h-0 lg:h-full pointer-events-none"
    >
      <div className="space-y-2 sm:space-y-1 lg:text-center">
        <div className="flex items-center gap-1.5 lg:justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="0.9em"
            height="0.9em"
            viewBox="0 0 24 24"
            className="text-neutral-600 dark:text-neutral-100"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M13 4V2c4.66.5 8.33 4.19 8.85 8.85c.6 5.49-3.35 10.43-8.85 11.03v-2c3.64-.45 6.5-3.32 6.96-6.96A7.994 7.994 0 0 0 13 4m-7.33.2A9.8 9.8 0 0 1 11 2v2.06c-1.43.2-2.78.78-3.9 1.68zM2.05 11a9.8 9.8 0 0 1 2.21-5.33L5.69 7.1A8 8 0 0 0 4.05 11zm2.22 7.33A10.04 10.04 0 0 1 2.06 13h2c.18 1.42.75 2.77 1.63 3.9zm1.4 1.41l1.39-1.37h.04c1.13.88 2.48 1.45 3.9 1.63v2c-1.96-.21-3.82-1-5.33-2.26M12 17l1.56-3.42L17 12l-3.44-1.56L12 7l-1.57 3.44L7 12l3.43 1.58z"
            />
          </svg>
          <span className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-100">
            Seja dono do seu Whatsapp Business
          </span>
        </div>
        <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl text-neutral-800 dark:text-neutral-200 tracking-tight leading-tight">
          <div>Não somos provedores da Meta, aqui você </div>
          <div className="relative inline-flex overflow-hidden align-bottom">
            <AnimatePresence mode="wait">
              <motion.span
                key={rotatingWords[wordIndex]}
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "-100%", opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="font-bold inline-block border-b border-dashed border-foreground/20"
              >
                {rotatingWords[wordIndex]}
              </motion.span>
            </AnimatePresence>
          </div>
        </h1>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-3 sm:pt-4 lg:mt-5 lg:justify-center pointer-events-auto">
          <Link
            href="/docs/installation"
            className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 bg-neutral-900 text-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 text-xs sm:text-sm font-medium hover:opacity-90 transition-colors"
          >
            Guia de Instalação
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
