export type ParticlePalette = {
  readonly served: string;
  readonly dropped: string;
};

const FALLBACK: ParticlePalette = {
  served: "oklch(0.72 0.17 155)",
  dropped: "oklch(0.64 0.2 25)",
};

export function readParticlePalette(): ParticlePalette {
  if (typeof window === "undefined") {
    return FALLBACK;
  }

  const styles = getComputedStyle(document.documentElement);
  const served = styles.getPropertyValue("--health-ok").trim();
  const dropped = styles.getPropertyValue("--health-fail").trim();

  return {
    served: served || FALLBACK.served,
    dropped: dropped || FALLBACK.dropped,
  };
}
