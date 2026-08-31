import React, { useRef, useEffect } from 'react';

interface VoiceOrbProps {
  isListening: boolean;
  isSpeaking: boolean;
  /** Diameter of the canvas in CSS pixels */
  size?: number;
}

// ---------------------------------------------------------------------------
// Tiny seeded noise helper (no deps) — deterministic pseudo-random per particle
// ---------------------------------------------------------------------------
const pseudoRand = (seed: number) => {
  const x = Math.sin(seed + 1) * 43758.5453;
  return x - Math.floor(x);
};

const VoiceOrb: React.FC<VoiceOrbProps> = ({ isListening, isSpeaking, size = 260 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  // Use refs to avoid stale closure inside animation loop
  const stateRef  = useRef({ isListening, isSpeaking });

  useEffect(() => {
    stateRef.current = { isListening, isSpeaking };
  }, [isListening, isSpeaking]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Hi-DPI support
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width  = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.37;
    const N = 1100; // particle count

    // ---------- Build particle pool ----------
    interface Particle {
      theta: number; phi: number; r: number;
      noiseOffset: number; noiseSpeed: number;
      rotSpeed: number; baseSize: number; baseAlpha: number;
    }
    const particles: Particle[] = [];
    for (let i = 0; i < N; i++) {
      // Uniform distribution on sphere surface (golden angle)
      const theta = pseudoRand(i * 7.3) * Math.PI * 2;
      const phi   = Math.acos(2 * pseudoRand(i * 3.1 + 1) - 1);
      particles.push({
        theta,
        phi,
        r:          radius * (0.80 + pseudoRand(i * 1.7) * 0.22),
        noiseOffset:pseudoRand(i * 5.3) * Math.PI * 2,
        noiseSpeed: 0.008 + pseudoRand(i * 9.1) * 0.018,
        rotSpeed:   (pseudoRand(i * 2.9) - 0.5) * 0.003,
        baseSize:   0.7 + pseudoRand(i * 4.4) * 1.3,
        baseAlpha:  0.25 + pseudoRand(i * 6.1) * 0.65,
      });
    }

    // ---------- Colour targets ----------
    //  idle    →  muted terracotta  (#8c7569 warm mid)
    //  listen  →  brand orange      (#b56b37)
    //  speak   →  brand olive-green (#63703d)
    type RGB = { r: number; g: number; b: number };
    const COL_IDLE:   RGB = { r: 176, g: 140, b: 110 };
    const COL_LISTEN: RGB = { r: 181, g: 107, b:  55 };
    const COL_SPEAK:  RGB = { r:  99, g: 112, b:  61 };

    let col: RGB = { ...COL_IDLE };
    let amp   = 0;        // current amplitude  [0 → 1]
    let tGlob = 0;        // global time counter

    const lerp  = (a: number, b: number, t: number) => a + (b - a) * t;
    const lerpRGB = (a: RGB, b: RGB, t: number): RGB => ({
      r: lerp(a.r, b.r, t),
      g: lerp(a.g, b.g, t),
      b: lerp(a.b, b.b, t),
    });

    // ---------- Draw loop ----------
    const draw = () => {
      const { isListening: L, isSpeaking: S } = stateRef.current;

      // Smooth amplitude towards target
      const ampTarget = L ? 1.0 : S ? 0.75 : 0.08;
      amp += (ampTarget - amp) * 0.06;

      // Smooth colour towards target
      const colTarget = S ? COL_SPEAK : L ? COL_LISTEN : COL_IDLE;
      col = lerpRGB(col, colTarget, 0.05);

      ctx.clearRect(0, 0, size, size);
      tGlob += 0.007;

      for (let i = 0; i < N; i++) {
        const p = particles[i];
        p.noiseOffset += p.noiseSpeed;

        // Noise-based radial + angular warp
        const warp  = amp * 20;
        const sinN  = Math.sin(p.noiseOffset);
        const cosN  = Math.cos(p.noiseOffset * 1.4);
        const dr    = sinN * warp * 0.6;
        const dPhi  = cosN * amp * 0.25;

        // Slow rotation
        const theta = p.theta + tGlob * p.rotSpeed * 2;
        const phi   = p.phi   + dPhi;
        const r     = p.r     + dr;

        // 3-D → 2-D projection (isometric-ish: y-axis squished)
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        const x3 = r * sinPhi * cosTheta;
        const y3 = r * cosPhi;
        const z3 = r * sinPhi * sinTheta;

        const px = cx + x3 + sinN * warp * 0.3;
        const py = cy + y3 * 0.88 + z3 * 0.35 + cosN * warp * 0.2;

        // Depth cue: particles facing camera are brighter & larger
        const depth  = (x3 / r + 1) / 2;              // 0 (back) → 1 (front)
        const alpha  = p.baseAlpha * (0.25 + depth * 0.75) * (0.55 + amp * 0.45);
        const ptSize = p.baseSize  * (0.55 + depth * 0.50) * (1   + amp * 0.7);

        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.3, ptSize), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${Math.round(col.r)},${Math.round(col.g)},${Math.round(col.b)},${alpha.toFixed(3)})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]); // re-init only if size changes

  return (
    <canvas
      ref={canvasRef}
      aria-label="Voice activity visualizer"
      style={{ display: 'block', borderRadius: '50%' }}
    />
  );
};

export default VoiceOrb;
