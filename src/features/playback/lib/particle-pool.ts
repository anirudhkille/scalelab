import type { EdgeId } from "@/features/architecture";

export const PARTICLE_LIMIT = 400;

export type Particle = {
  active: boolean;
  edgeId: EdgeId | null;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
  t: number;
  speed: number;
  dropped: boolean;
};

export type ParticleSpawn = Omit<Particle, "active" | "t">;

export type ParticlePool = {
  readonly particles: Particle[];
  cursor: number;
};

function emptyParticle(): Particle {
  return {
    active: false,
    edgeId: null,
    x0: 0,
    y0: 0,
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
    x3: 0,
    y3: 0,
    t: 0,
    speed: 1,
    dropped: false,
  };
}

export function createParticlePool(limit = PARTICLE_LIMIT): ParticlePool {
  return {
    particles: Array.from({ length: limit }, emptyParticle),
    cursor: 0,
  };
}

export function spawnParticle(pool: ParticlePool, spawn: ParticleSpawn): boolean {
  for (let offset = 0; offset < pool.particles.length; offset += 1) {
    const index = (pool.cursor + offset) % pool.particles.length;
    const particle = pool.particles[index];

    if (particle && !particle.active) {
      Object.assign(particle, spawn, { active: true, t: 0 });
      pool.cursor = (index + 1) % pool.particles.length;
      return true;
    }
  }

  return false;
}
