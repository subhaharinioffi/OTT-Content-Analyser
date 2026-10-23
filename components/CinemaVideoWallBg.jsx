'use client';

import { useEffect, useRef } from 'react';
import styles from './CinemaVideoWallBg.module.css';

/**
 * CinemaVideoWallBg Component
 * 
 * Reuses the Dashboard's OTT background image (/dashboard-bg.jpg)
 * and animates it into a continuous, seamless GIF-like video loop effect:
 * 1. Fixed background layer with overflow-hidden & pointer-events-none.
 * 2. Scaled-up continuous 20s keyframe animation (subtle diagonal pan, rotation & breathing drift).
 * 3. Animated crimson red scanline / ambient light sweep (#e50914 at 15% opacity) with scanline texture.
 * 4. Lightweight HTML5 Canvas floating cinema dust particles (crimson & gold embers).
 * 5. Dark obsidian vignette overlay (from-[#07090e]/80 via-[#07090e]/75 to-[#07090e]/95)
 *    ensuring glassmorphic cards remain 100% readable.
 */
export default function CinemaVideoWallBg() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize, { passive: true });

    // Floating cinema dust particles (38 lightweight embers)
    const particleCount = 38;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.6 + 0.6,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -(Math.random() * 0.4 + 0.12), // gentle upward drift
      alpha: Math.random() * 0.35 + 0.1,
      targetAlpha: Math.random() * 0.4 + 0.12,
      isCrimson: Math.random() > 0.45,
    }));

    let lastTime = performance.now();

    const render = (time) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around boundaries
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        // Subtle alpha breathing
        p.alpha += (p.targetAlpha - p.alpha) * 0.02;
        if (Math.abs(p.targetAlpha - p.alpha) < 0.03) {
          p.targetAlpha = Math.random() * 0.35 + 0.08;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        if (p.isCrimson) {
          ctx.fillStyle = `rgba(229, 28, 35, ${p.alpha})`; // crimson #e51c23
        } else {
          ctx.fillStyle = `rgba(245, 158, 11, ${p.alpha * 0.85})`; // warm amber
        }
        ctx.shadowBlur = 5;
        ctx.shadowColor = p.isCrimson ? 'rgba(229, 28, 35, 0.4)' : 'rgba(245, 158, 11, 0.35)';
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className={styles.videoWallContainer} aria-hidden="true">
      {/* 1. Live Looping Video Wall Poster Image (20-second continuous breathe & pan) */}
      <div className={styles.posterWall} />

      {/* 2. Animated Crimson Red Scanline / Ambient Light Sweep */}
      <div className={styles.crimsonLightSweep} />
      <div className={styles.scanlineOverlay} />

      {/* 3. Floating Cinema Dust Particles Canvas */}
      <canvas ref={canvasRef} className={styles.dustCanvas} />

      {/* 4. Dark Obsidian Vignette Overlay (Obsidian / Dark Palette Mask) */}
      <div className={styles.obsidianVignette} />
    </div>
  );
}
