# 0015. Landing page motion

## Status

Accepted.

## Decision

- The hero leads one entrance wave. Headline lines travel furthest, the
  description less, and gaps shrink so the group reads as one wave. The accent
  in line 1 pops in place as the line settles. Side-by-side CTAs arrive
  together.
- The right column follows as the hero's CTAs land, with gaps and travel
  shrinking item by item. Reveals already in view at load join the end of the
  wave. Without the hero there is no lead-in.
- The hero ships with the WebGL chunk and can mount late, so other intros wait
  for it only up to a fallback delay.
- The shader crossfades with the CSS gradient fallback over 700ms ease-out; the
  fallback has no wrapper fade of its own. Reduced motion collapses the wave
  into one shared fade.
- The bot assistant arrives once the hero and content wave have settled and
  speaks once it has mostly landed; the balloon's tail comes with it.
