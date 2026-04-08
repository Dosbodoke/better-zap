"use client";

import { useState, useEffect } from "react";

export default function HeroGeometricClient() {
  const [HeroGeometric, setHeroGeometric] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    import("./HeroGeometric").then((mod) => {
      setHeroGeometric(() => mod.default);
    });
  }, []);

  if (!HeroGeometric) {
    return <div className="w-full h-full bg-[#E8FFF0]" />;
  }

  return <HeroGeometric />;
}
