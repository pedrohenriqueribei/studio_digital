import React, { useEffect, useRef } from 'react';

interface LoyaltyConfettiBurstProps {
  active: boolean;
  burstKey?: number;
  intensity?: 'milestone' | 'reward';
  onComplete?: () => void;
}

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  tiltAngle: number;
  tiltSpeed: number;
  shape: 'rect' | 'circle';
  alpha: number;
}

const CONFETTI_COLORS = [
  '#10b981', // emerald-500
  '#34d399', // emerald-400
  '#f59e0b', // amber-500
  '#fbbf24', // amber-400
  '#14b8a6', // teal-500
  '#f8fafc', // slate-50
];

export const LoyaltyConfettiBurst: React.FC<LoyaltyConfettiBurstProps> = ({
  active,
  burstKey = 0,
  intensity = 'milestone',
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!active) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      const timer = setTimeout(() => {
        onCompleteRef.current?.();
      }, 600);
      return () => clearTimeout(timer);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const width = window.innerWidth;
    const height = window.innerHeight;
    const particles: ConfettiParticle[] = [];

    const spawnBurst = (originX: number, originY: number, count: number, spreadAngle: number, baseAngle: number) => {
      for (let i = 0; i < count; i++) {
        const angle = baseAngle + (Math.random() - 0.5) * spreadAngle;
        const speed = 7 + Math.random() * (intensity === 'reward' ? 11 : 8.5);
        particles.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - Math.random() * 2,
          width: 6 + Math.random() * 6,
          height: 4 + Math.random() * 5,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.22,
          tiltAngle: Math.random() * Math.PI * 2,
          tiltSpeed: 0.06 + Math.random() * 0.08,
          shape: Math.random() > 0.22 ? 'rect' : 'circle',
          alpha: 1,
        });
      }
    };

    // Launch balanced left + right + top-center confetti cannons
    const sideCount = intensity === 'reward' ? 52 : 34;
    const centerCount = intensity === 'reward' ? 56 : 32;

    spawnBurst(width * 0.14, height * 0.62, sideCount, Math.PI * 0.48, -Math.PI * 0.36);
    spawnBurst(width * 0.86, height * 0.62, sideCount, Math.PI * 0.48, -Math.PI * 0.64);
    spawnBurst(width * 0.5, height * 0.28, centerCount, Math.PI * 1.15, -Math.PI * 0.5);

    let followUpTimer: ReturnType<typeof setTimeout> | null = null;
    if (intensity === 'reward') {
      followUpTimer = setTimeout(() => {
        spawnBurst(width * 0.32, height * 0.48, 30, Math.PI * 0.65, -Math.PI * 0.5);
        spawnBurst(width * 0.68, height * 0.48, 30, Math.PI * 0.65, -Math.PI * 0.5);
      }, 420);
    }

    const startTime = performance.now();
    const maxDurationMs = intensity === 'reward' ? 3600 : 2800;

    const renderFrame = (now: number) => {
      const elapsed = now - startTime;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      let aliveCount = 0;
      const gravity = 0.24;
      const drag = 0.985;
      const fadeThreshold = maxDurationMs * 0.68;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.vx *= drag;
        p.vy = p.vy * drag + gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.tiltAngle += p.tiltSpeed;

        if (elapsed > fadeThreshold) {
          p.alpha = Math.max(0, 1 - (elapsed - fadeThreshold) / (maxDurationMs - fadeThreshold));
        }

        if (p.alpha <= 0.02 || p.y > window.innerHeight + 40) {
          continue;
        }

        aliveCount++;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        const tiltScale = Math.cos(p.tiltAngle);
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.width * 0.42, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.width / 2, (-p.height * tiltScale) / 2, p.width, p.height * tiltScale);
        }
        ctx.restore();
      }

      if (elapsed < maxDurationMs && aliveCount > 0) {
        animationFrameId = requestAnimationFrame(renderFrame);
      } else {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        onCompleteRef.current?.();
      }
    };

    animationFrameId = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (followUpTimer) clearTimeout(followUpTimer);
      window.removeEventListener('resize', resize);
    };
  }, [active, burstKey, intensity]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-50"
    />
  );
};
