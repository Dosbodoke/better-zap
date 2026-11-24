import gsap from "gsap";

const HERO_INTRO_EVENT = "landing:hero-intro";

const HERO_INTRO_FALLBACK_SECONDS = 0.5;

export function signalHeroIntroStart() {
  window.dispatchEvent(new Event(HERO_INTRO_EVENT));
}

export function onHeroIntroStart(onStart: (fromFallback: boolean) => void) {
  const start = (fromFallback: boolean) => {
    fallback.kill();
    window.removeEventListener(HERO_INTRO_EVENT, startFromHero);
    onStart(fromFallback);
  };
  const startFromHero = () => start(false);
  const fallback = gsap.delayedCall(HERO_INTRO_FALLBACK_SECONDS, start, [true]);

  window.addEventListener(HERO_INTRO_EVENT, startFromHero);

  return () => {
    fallback.kill();
    window.removeEventListener(HERO_INTRO_EVENT, startFromHero);
  };
}
