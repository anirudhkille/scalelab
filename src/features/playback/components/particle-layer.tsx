import { useEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";

import {
  NODE_CARD_HEIGHT,
  NODE_CARD_WIDTH,
  useDesignStore,
  type EdgeId,
} from "@/features/architecture";
import { selectSettings, useSettingsStore } from "@/features/settings";
import { selectRunStatus, useRunStore } from "@/features/simulation";

import { readParticlePalette } from "../lib/palette";
import { createParticlePool, spawnParticle } from "../lib/particle-pool";

const RPS_PER_PARTICLE = 25;
const MAX_SPAWNS_PER_EDGE_FRAME = 4;

function reducedMotionAllowed(preference: "system" | "on" | "off"): boolean {
  if (preference === "on") {
    return false;
  }

  if (preference === "off") {
    return true;
  }

  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function cubicCoordinate(a: number, b: number, c: number, d: number, t: number): number {
  const mt = 1 - t;
  return mt * mt * mt * a + 3 * mt * mt * t * b + 3 * mt * t * t * c + t * t * t * d;
}

export function ParticleLayer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const poolRef = useRef(createParticlePool());
  const accumulatorsRef = useRef(new Map<EdgeId, number>());
  const lastFrameRef = useRef<number | null>(null);
  const settings = useSettingsStore(selectSettings);
  const paletteRef = useRef(readParticlePalette());
  const paletteThemeRef = useRef(settings.theme);
  const status = useRunStore(selectRunStatus);

  const enabled = settings.particles && reducedMotionAllowed(settings.reducedMotion);
  const { getViewport } = useReactFlow();

  useEffect(() => {
    if (paletteThemeRef.current === settings.theme) {
      return;
    }

    paletteThemeRef.current = settings.theme;
    paletteRef.current = readParticlePalette();
  }, [settings.theme]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let frameId = 0;

    const drawFrame = (now: number) => {
      const previous = lastFrameRef.current;
      const dt = previous === null ? 0 : Math.min(0.1, (now - previous) / 1000);
      lastFrameRef.current = now;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);

      const architecture = useDesignStore.getState().architecture;
      const run = useRunStore.getState();
      const step = run.step;
      const running = run.status === "running" && step !== null;
      const viewport = getViewport();
      const nodeById = new Map(architecture.nodes.map((node) => [node.id, node]));
      const edgeById = new Map(architecture.edges.map((edge) => [edge.id, edge]));
      const droppedRatio = step
        ? Math.min(1, step.metrics.droppedRps / Math.max(step.metrics.offeredRps, 1))
        : 0;

      if (running && step && dt > 0) {
        for (const edgeFlow of step.edges) {
          if (edgeFlow.rps <= 0) {
            continue;
          }

          const edge = edgeById.get(edgeFlow.edgeId);
          const source = edge ? nodeById.get(edge.source) : undefined;
          const target = edge ? nodeById.get(edge.target) : undefined;

          if (!source || !target) {
            continue;
          }

          const accumulator =
            (accumulatorsRef.current.get(edgeFlow.edgeId) ?? 0) +
            (edgeFlow.rps / RPS_PER_PARTICLE) * dt;
          const spawnCount = Math.min(MAX_SPAWNS_PER_EDGE_FRAME, Math.floor(accumulator));
          accumulatorsRef.current.set(edgeFlow.edgeId, accumulator - spawnCount);

          const startX = source.position.x + NODE_CARD_WIDTH;
          const startY = source.position.y + NODE_CARD_HEIGHT / 2;
          const endX = target.position.x;
          const endY = target.position.y + NODE_CARD_HEIGHT / 2;
          const curve = Math.max(40, Math.abs(endX - startX) * 0.5);

          for (let index = 0; index < spawnCount; index += 1) {
            spawnParticle(poolRef.current, {
              edgeId: edgeFlow.edgeId,
              x0: startX,
              y0: startY,
              x1: startX + curve,
              y1: startY,
              x2: endX - curve,
              y2: endY,
              x3: endX,
              y3: endY,
              speed: 0.55 + Math.random() * 0.25,
              dropped: Math.random() < droppedRatio,
            });
          }
        }
      } else {
        accumulatorsRef.current.clear();
      }

      for (const particle of poolRef.current.particles) {
        if (!particle.active) {
          continue;
        }

        particle.t += dt * particle.speed;

        if (particle.t >= 1) {
          particle.active = false;
          continue;
        }

        const flowX = cubicCoordinate(
          particle.x0,
          particle.x1,
          particle.x2,
          particle.x3,
          particle.t,
        );
        const flowY = cubicCoordinate(
          particle.y0,
          particle.y1,
          particle.y2,
          particle.y3,
          particle.t,
        );
        const x = flowX * viewport.zoom + viewport.x;
        const y = flowY * viewport.zoom + viewport.y;
        const alpha = Math.max(0, 1 - particle.t) * (particle.t < 0.08 ? particle.t / 0.08 : 1);

        context.globalAlpha = alpha;
        context.fillStyle = particle.dropped
          ? paletteRef.current.dropped
          : paletteRef.current.served;
        context.beginPath();
        context.arc(x, y, particle.dropped ? 2.1 : 1.7, 0, Math.PI * 2);
        context.fill();
      }

      context.globalAlpha = 1;
      frameId = window.requestAnimationFrame(drawFrame);
    };

    frameId = window.requestAnimationFrame(drawFrame);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      lastFrameRef.current = null;
    };
  }, [enabled, getViewport]);

  if (!enabled) {
    return null;
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      {status === "running" ? (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border/70 bg-card/85 px-2.5 py-1 font-mono text-[10px] text-muted-foreground shadow-sm backdrop-blur">
          <span className="size-1.5 rounded-full bg-health-ok" aria-hidden="true" />
          <span className="size-1.5 rounded-full bg-health-fail" aria-hidden="true" />1 dot ≈{" "}
          {RPS_PER_PARTICLE} req/s
        </div>
      ) : null}
    </div>
  );
}
