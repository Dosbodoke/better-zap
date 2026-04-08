"use client";

import { useState, useEffect } from "react";

export default function HeroGeometricClient() {
  const [HeroGeometric, setHeroGeometric] =
    useState<React.ComponentType | null>(null);

  useEffect(() => {
    import("./HeroGeometric").then((mod) => {
      setHeroGeometric(() => mod.default);
    });
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* CSS gradient fallback — approximates the shader output */}
      <div
        className="absolute inset-0 transition-opacity duration-700 ease-out"
        style={{
          opacity: HeroGeometric ? 0 : 1,
          background:
            "linear-gradient(135deg, #fff 0%, #E8FFF0 30%, #6ee7a0 60%, #25D366 100%)",
        }}
      />
      {HeroGeometric ? (
        <div className="absolute inset-0 animate-fade-in">
          <HeroGeometric />
        </div>
      ) : null}
    </div>
  );
}
