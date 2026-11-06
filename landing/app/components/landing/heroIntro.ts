import gsap from "gsap";

const HERO_INTRO_EVENT = "landing:hero-intro";

// The hero ships with the WebGL chunk, so it can mount late. Other intros
// follow it, but never wait longer than this for it to show up.
const HERO_INTRO_FALLBACK_SECONDS = 0.5;

export function signalHeroIntroStart() {
  window.dispatchEvent(new Event(HERO_INTRO_EVENT));
}

/**
 * Calls `onStart(fromFallback)` once: when the hero intro starts, or after
 * the fallback if it hasn't. Call inside a GSAP context so the fallback is
 * reverted with it; returns a cleanup for the event listener.
 */
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
