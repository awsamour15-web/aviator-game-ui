import React, { useEffect, useRef } from 'react';
import type { GamePhase } from '../types';
import { ShieldCheck } from 'lucide-react';

interface AviatorCanvasProps {
  phase: GamePhase;
  multiplier: number;
  countdownRemaining: number;
  crashMultiplier: number | null;
  roundNumber: number;
  hash: string;
  onOpenProvablyFair: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  life: number;
}

export const AviatorCanvas: React.FC<AviatorCanvasProps> = ({
  phase,
  multiplier,
  countdownRemaining,
  crashMultiplier,
  roundNumber,
  hash,
  onOpenProvablyFair,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameId = useRef<number>(0);

  // Plane & particle states
  const planePos = useRef<{ x: number; y: number; angle: number }>({ x: 0, y: 0, angle: 0 });
  const particles = useRef<Particle[]>([]);
  const propellerAngle = useRef<number>(0);
  const crashAnimationProgress = useRef<number>(0);

  // Preloaded animated plane frame images
  const planeImages = useRef<HTMLImageElement[]>([]);
  const imagesLoaded = useRef<boolean>(false);

  useEffect(() => {
    const frameSources = [
      '/plane-anim-0.svg',
      '/plane-anim-1.svg',
      '/plane-anim-2.svg',
      '/plane-anim-3.svg',
    ];
    let loadedCount = 0;
    planeImages.current = frameSources.map((src) => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount === frameSources.length) {
          imagesLoaded.current = true;
        }
      };
      img.src = src;
      return img;
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const handleResize = () => {
      if (!containerRef.current || !canvas) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    const resizeObserver = new ResizeObserver(() => handleResize());
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Coordinates bounds - starts exactly at bottom-left corner (0, height)
      const startX = 0;
      const startY = height;
      const targetMaxX = width - 65;
      const targetMaxY = 45;

      if (phase === 'FLYING') {
        crashAnimationProgress.current = 0;

        // Smooth flight curve progression matching Aviator physics
        const t = Math.min(1, Math.max(0, (multiplier - 1) / 4.0));
        const progress = Math.min(0.92, 0.24 + Math.pow(t, 0.52) * 0.68);

        // Subtly hover the plane with small sinusoidal sway
        const hover = Math.sin(Date.now() / 260) * 3;

        const currentX = startX + (targetMaxX - startX) * progress;
        const currentY = startY - (startY - targetMaxY) * Math.pow(progress, 0.78) + hover;

        // Plane angle tangents the curve (~ -15 deg)
        const angle = -0.26 + Math.cos(Date.now() / 320) * 0.03;
        planePos.current = { x: currentX, y: currentY, angle };

        // 1. Draw Trajectory Curve & Solid Crimson Area Fill
        drawTrajectory(ctx, startX, startY, currentX, currentY);

        // 2. Spawn smoke & jet exhaust particles
        spawnExhaustParticles(currentX, currentY, angle);

        // 3. Update and render particles
        updateAndDrawParticles(ctx);

        // 4. Draw the Aviator Jet with spinning propeller frames
        const frameIdx = Math.floor(Date.now() / 65) % 4;
        drawAviatorPlane(ctx, currentX, currentY, angle, frameIdx);
      } else if (phase === 'CRASHED') {
        crashAnimationProgress.current += 1;
        const crashP = crashAnimationProgress.current;

        // Plane zooms fast off the top-right screen
        const lastX = planePos.current.x;
        const lastY = planePos.current.y;
        const flyOffX = lastX + crashP * 14;
        const flyOffY = lastY - crashP * 12;
        const flyOffAngle = -0.65;
        const crashFrame = Math.floor(Date.now() / 45) % 4;

        if (crashP < 45) {
          drawTrajectory(ctx, startX, startY, flyOffX, flyOffY, true);
          drawAviatorPlane(ctx, flyOffX, flyOffY, flyOffAngle, crashFrame, 0.85);
        }

        updateAndDrawParticles(ctx);
      } else {
        // WAITING_BETS phase
        crashAnimationProgress.current = 0;
        particles.current = [];
        planePos.current = { x: startX, y: startY, angle: 0 };
        // Small resting plane ready on runway (frame 0)
        drawAviatorPlane(ctx, 35, startY - 18, -0.05, 0, 0.55);
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameId.current);
      resizeObserver.disconnect();
    };
  }, [phase, multiplier]);

  // Particle helper
  const spawnExhaustParticles = (x: number, y: number, angle: number) => {
    // Spawn 2-3 particles per frame directly behind the tail skid
    const tailOffset = -42;
    const spawnX = x + Math.cos(angle) * tailOffset - Math.sin(angle) * 4;
    const spawnY = y + Math.sin(angle) * tailOffset + Math.cos(angle) * 4;

    for (let i = 0; i < 2; i++) {
      const isFire = Math.random() < 0.45;
      particles.current.push({
        x: spawnX + (Math.random() - 0.5) * 4,
        y: spawnY + (Math.random() - 0.5) * 4,
        vx: -Math.cos(angle) * (2.5 + Math.random() * 2) + (Math.random() - 0.5) * 1.5,
        vy: -Math.sin(angle) * (2.5 + Math.random() * 2) + (Math.random() - 0.5) * 1.5,
        size: isFire ? Math.random() * 3 + 2.5 : Math.random() * 6 + 3,
        alpha: 0.85,
        color: isFire ? '#ff5500' : '#e5053a',
        life: 1,
      });
    }

    if (particles.current.length > 120) {
      particles.current = particles.current.slice(-100);
    }
  };

  const updateAndDrawParticles = (ctx: CanvasRenderingContext2D) => {
    for (let i = particles.current.length - 1; i >= 0; i--) {
      const p = particles.current[i];
      p.x += p.vx;
      p.y += p.vy;
      p.size += 0.25;
      p.alpha -= 0.025;
      p.life -= 0.025;

      if (p.alpha <= 0 || p.life <= 0) {
        particles.current.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  // Draw background grid lines and scale
  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;

    // Horizontal altitude grid lines
    const gridRows = 5;
    for (let i = 1; i < gridRows; i++) {
      const y = (height / gridRows) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Vertical time lines
    const gridCols = 6;
    for (let i = 1; i < gridCols; i++) {
      const x = (width / gridCols) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Base axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.moveTo(35, height - 35);
    ctx.lineTo(width - 15, height - 35);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(35, 20);
    ctx.lineTo(35, height - 35);
    ctx.stroke();

    ctx.restore();
  };

  // Draw trajectory line with rich crimson area fill and neon stroke
  const drawTrajectory = (
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    isCrash = false
  ) => {
    ctx.save();

    // Control point for smooth parabolic curve
    const cpX = startX + (endX - startX) * 0.42;
    const cpY = startY;

    // 1. Fill solid rich crimson red under curve down to y = startY (height)
    if (!isCrash) {
      const gradient = ctx.createLinearGradient(0, endY, 0, startY);
      gradient.addColorStop(0, 'rgba(215, 8, 48, 0.85)');
      gradient.addColorStop(0.5, 'rgba(188, 6, 42, 0.88)');
      gradient.addColorStop(1, 'rgba(145, 4, 30, 0.92)');
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = 'rgba(175, 15, 25, 0.45)';
    }

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(cpX, cpY, endX, endY);
    ctx.lineTo(endX, startY);
    ctx.lineTo(startX, startY);
    ctx.closePath();
    ctx.fill();

    // 2. Glowing stroke line on top
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(cpX, cpY, endX, endY);
    ctx.strokeStyle = isCrash ? '#ef4444' : '#ff144c';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = isCrash ? '#dc2626' : '#e5053a';
    ctx.shadowBlur = 12;
    ctx.stroke();

    ctx.restore();
  };

  // Draw the iconic red Aviator propeller monoplane
  const drawAviatorPlane = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    frameIndex = 0,
    alpha = 1.0,
    scale = 0.72
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;

    const img = planeImages.current[frameIndex % 4];
    if (img && img.complete && img.naturalWidth > 0) {
      // SVG viewBox is 200 x 100
      const w = 150 * scale;
      const h = 75 * scale;
      // Centered at fuselage center
      ctx.drawImage(img, -w * 0.52, -h * 0.5, w, h);
    } else {
      // Fallback vector drawing
      const s = 1.15;
      ctx.fillStyle = '#9f1239';
      ctx.beginPath();
      ctx.moveTo(-18 * s, 6 * s);
      ctx.lineTo(-4 * s, 18 * s);
      ctx.lineTo(6 * s, 14 * s);
      ctx.lineTo(0 * s, 4 * s);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#e5053a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 24 * s, 8 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(6 * s, -3 * s, 6 * s, 3.5 * s, -0.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(-10 * s, -2 * s);
      ctx.lineTo(2 * s, -16 * s);
      ctx.lineTo(12 * s, -12 * s);
      ctx.lineTo(6 * s, -1 * s);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  };

  // Get color and glow style based on current multiplier
  const getMultiplierStyle = (m: number) => {
    if (m >= 10.0) {
      return {
        textColor: 'text-amber-300',
        glowClass: 'drop-shadow-[0_0_25px_rgba(251,191,36,0.6)]',
      };
    }
    if (m >= 2.0) {
      return {
        textColor: 'text-rose-400',
        glowClass: 'drop-shadow-[0_0_20px_rgba(244,63,94,0.5)]',
      };
    }
    return {
      textColor: 'text-white',
      glowClass: 'drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]',
    };
  };

  const style = getMultiplierStyle(multiplier);

  return (
    <div
      ref={containerRef}
      id="aviator-canvas-container"
      className="relative w-full h-64 sm:h-72 md:h-80 lg:h-96 bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center select-none"
    >
      {/* Rotating Sunburst Background originating from bottom-left corner (0, 100%) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <img
          src="/bg-sun.svg"
          alt=""
          className="absolute pointer-events-none select-none max-w-none text-white/15"
          style={{
            left: 0,
            bottom: 0,
            width: '1800px',
            height: '1800px',
            transform: 'translate(-50%, 50%)',
            opacity: phase === 'FLYING' ? 0.22 : 0.1,
            animation: 'spin 90s linear infinite',
            filter: 'brightness(1.1) contrast(1.15)',
          }}
        />
      </div>

      {/* Atmospheric Cyan Backlight Glow behind multiplier & plane */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          background:
            phase === 'FLYING'
              ? 'radial-gradient(ellipse 65% 55% at 52% 48%, rgba(56, 189, 248, 0.42) 0%, rgba(14, 165, 233, 0.18) 35%, rgba(2, 132, 199, 0.04) 65%, transparent 80%)'
              : 'none',
        }}
      />

      {/* HTML5 Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Provably Fair Badge (Top-Right) */}
      <button
        id="provably-fair-badge-btn"
        onClick={onOpenProvablyFair}
        className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-white/10 text-xs font-medium text-gray-300 hover:text-white hover:border-white/20 hover:bg-black/80 transition-all shadow-md backdrop-blur-md cursor-pointer"
        title="Provably Fair Cryptographic Verification"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-[11px] font-mono tracking-tight font-semibold">Provably Fair</span>
      </button>

      {/* Round ID Tag (Top-Left) */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-white/10 text-[11px] font-mono text-gray-400 backdrop-blur-md">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
        <span className="font-bold">#{roundNumber}</span>
      </div>

      {/* Center Multiplier HUD */}
      <div className="relative z-10 pointer-events-none flex flex-col items-center justify-center text-center px-4">
        {phase === 'FLYING' && (
          <div className="flex flex-col items-center animate-in fade-in duration-100">
            <span
              id="live-multiplier-display"
              className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black leading-none text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] tracking-tight font-sans select-none"
            >
              {multiplier.toFixed(2)}x
            </span>
          </div>
        )}

        {phase === 'CRASHED' && (
          <div className="flex flex-col items-center animate-in zoom-in-90 duration-200">
            <span
              id="crashed-multiplier-display"
              className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black leading-none text-red-500 drop-shadow-[0_0_35px_rgba(220,38,38,0.6)] tracking-tight font-sans select-none"
            >
              {(crashMultiplier ?? multiplier).toFixed(2)}x
            </span>
            <span className="text-red-500 font-bold text-xs sm:text-sm md:text-base tracking-[0.3em] uppercase opacity-95 mt-2 drop-shadow-[0_0_10px_rgba(220,38,38,0.6)]">
              Flew away!
            </span>
          </div>
        )}

        {phase === 'WAITING_BETS' && (
          <div className="flex flex-col items-center max-w-xs w-full">
            <div className="text-5xl sm:text-6xl md:text-7xl font-black leading-none text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.2)] tracking-tight font-sans mb-1">
              {countdownRemaining.toFixed(1)}s
            </div>
            <span className="text-red-500 font-bold text-xs sm:text-sm tracking-[0.3em] uppercase opacity-80 mb-3">
              Next round starting
            </span>

            {/* Countdown Progress Bar */}
            <div className="w-48 sm:w-60 h-2 bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 via-red-500 to-red-600 rounded-full transition-all duration-300 ease-linear shadow-[0_0_10px_rgba(220,38,38,0.6)]"
                style={{ width: `${Math.max(0, Math.min(100, (countdownRemaining / 5.0) * 100))}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-500 font-mono mt-2 truncate max-w-[220px]">
              Seed Hash: {hash.slice(0, 16)}...
            </span>
          </div>
        )}
      </div>

      {/* Active Players Pill (Bottom-Right) matching reference UI */}
      <div
        id="active-players-pill"
        className="absolute bottom-3 right-3 z-10 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/75 border border-white/10 backdrop-blur-md shadow-lg select-none"
        title="Active online players in this round"
      >
        {/* 3 Overlapping Avatars with bright green border ring */}
        <div className="flex items-center -space-x-1.5">
          <div className="w-5 h-5 rounded-full overflow-hidden border-[1.5px] border-emerald-400 bg-zinc-800 flex items-center justify-center text-[10px] shadow-sm">
            🐶
          </div>
          <div className="w-5 h-5 rounded-full overflow-hidden border-[1.5px] border-emerald-400 bg-orange-600 flex items-center justify-center text-[10px] shadow-sm">
            🧑‍🚀
          </div>
          <div className="w-5 h-5 rounded-full overflow-hidden border-[1.5px] border-emerald-400 bg-amber-700 flex items-center justify-center text-[10px] shadow-sm">
            🐱
          </div>
        </div>
        <span className="text-[12px] font-bold text-white tracking-wide font-sans">
          {(3244 + ((roundNumber * 17) % 89)).toLocaleString()}
        </span>
      </div>
    </div>
  );
};
