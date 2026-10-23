'use client';

import { useRef, useEffect } from 'react';
import styles from './MagicBentoCard.module.css';

/**
 * MagicBentoCard Component
 * Based on React Bits (https://reactbits.dev/components/magic-bento)
 * 
 * Features:
 * - Real-time cursor spotlight tracking (--mb-x, --mb-y)
 * - Cursor-following neon border glow with CSS mask
 * - Click wave ripple animation across card edges
 * - Interactive 3D magnetic tilt physics
 * - Ambient floating star/ember particles canvas
 */
export default function MagicBentoCard({
  children,
  className = '',
  glowColor = '#E51C23',
  enableSpotlight = true,
  enableBorderGlow = true,
  enableStars = true,
  enableTilt = true,
  tiltFactor = 8,
  onClick,
  style = {},
  ...props
}) {
  const cardRef = useRef(null);
  const canvasRef = useRef(null);
  const waveTimerRef = useRef(null);

  // Parse hex to RGB
  const parseRgb = (hex) => {
    const clean = hex.replace('#', '');
    if (clean.length === 3) {
      return [
        parseInt(clean[0] + clean[0], 16),
        parseInt(clean[1] + clean[1], 16),
        parseInt(clean[2] + clean[2], 16),
      ];
    }
    if (clean.length === 6) {
      return [
        parseInt(clean.slice(0, 2), 16),
        parseInt(clean.slice(2, 4), 16),
        parseInt(clean.slice(4, 6), 16),
      ];
    }
    return [229, 28, 35]; // Default crimson
  };

  const rgb = parseRgb(glowColor);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    let rafId = 0;
    let isHovered = false;
    let targetX = -999;
    let targetY = -999;
    let currentX = -999;
    let currentY = -999;
    let targetRotateX = 0;
    let targetRotateY = 0;
    let currentRotateX = 0;
    let currentRotateY = 0;

    const onPointerEnter = (e) => {
      isHovered = true;
      card.style.setProperty('--mb-near', '1');
      card.style.setProperty('--mb-hot', '1');
      updatePointer(e);
    };

    const updatePointer = (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      targetX = x;
      targetY = y;

      if (enableTilt) {
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const nx = (x - centerX) / centerX;
        const ny = (y - centerY) / centerY;
        targetRotateY = nx * tiltFactor;
        targetRotateX = -ny * tiltFactor;
      }

      if (!rafId) {
        rafId = requestAnimationFrame(render);
      }
    };

    const onPointerMove = (e) => {
      updatePointer(e);
    };

    const onPointerLeave = () => {
      isHovered = false;
      card.style.setProperty('--mb-near', '0');
      card.style.setProperty('--mb-hot', '0');
      targetRotateX = 0;
      targetRotateY = 0;
      if (!rafId) {
        rafId = requestAnimationFrame(render);
      }
    };

    const render = () => {
      // Smooth interpolation for spotlight & tilt
      currentX += (targetX - currentX) * 0.25;
      currentY += (targetY - currentY) * 0.25;
      currentRotateX += (targetRotateX - currentRotateX) * 0.18;
      currentRotateY += (targetRotateY - currentRotateY) * 0.18;

      card.style.setProperty('--mb-x', `${currentX.toFixed(1)}px`);
      card.style.setProperty('--mb-y', `${currentY.toFixed(1)}px`);

      if (enableTilt) {
        card.style.setProperty('--mb-rx', `${currentRotateX.toFixed(2)}deg`);
        card.style.setProperty('--mb-ry', `${currentRotateY.toFixed(2)}deg`);
      }

      const isStillMoving =
        Math.abs(targetX - currentX) > 0.5 ||
        Math.abs(targetY - currentY) > 0.5 ||
        Math.abs(targetRotateX - currentRotateX) > 0.05 ||
        Math.abs(targetRotateY - currentRotateY) > 0.05;

      if (isStillMoving || isHovered) {
        rafId = requestAnimationFrame(render);
      } else {
        rafId = 0;
      }
    };

    card.addEventListener('pointerenter', onPointerEnter);
    card.addEventListener('pointermove', onPointerMove);
    card.addEventListener('pointerleave', onPointerLeave);

    return () => {
      cancelAnimationFrame(rafId);
      card.removeEventListener('pointerenter', onPointerEnter);
      card.removeEventListener('pointermove', onPointerMove);
      card.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [enableTilt, tiltFactor]);

  // Click wave ripple
  const handleClick = (e) => {
    const card = cardRef.current;
    if (card) {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mb-wx', `${x.toFixed(1)}px`);
      card.style.setProperty('--mb-wy', `${y.toFixed(1)}px`);
      card.classList.remove(styles.waveActive);
      // Trigger reflow
      void card.offsetWidth;
      card.classList.add(styles.waveActive);

      clearTimeout(waveTimerRef.current);
      waveTimerRef.current = setTimeout(() => {
        card.classList.remove(styles.waveActive);
      }, 900);
    }

    if (onClick) onClick(e);
  };

  // Ambient particle stars
  useEffect(() => {
    if (!enableStars) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId;
    let width = (canvas.width = canvas.parentElement?.offsetWidth || 300);
    let height = (canvas.height = canvas.parentElement?.offsetHeight || 200);

    const onResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.offsetWidth;
      height = canvas.height = canvas.parentElement.offsetHeight;
    };

    window.addEventListener('resize', onResize, { passive: true });

    const count = 16;
    const stars = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.4 + 0.1,
      targetAlpha: Math.random() * 0.5 + 0.1,
      speed: Math.random() * 0.015 + 0.005,
    }));

    const drawStars = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < count; i++) {
        const s = stars[i];
        s.alpha += (s.targetAlpha - s.alpha) * s.speed;
        if (Math.abs(s.targetAlpha - s.alpha) < 0.02) {
          s.targetAlpha = Math.random() * 0.5 + 0.08;
        }

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${s.alpha})`;
        ctx.shadowBlur = 4;
        ctx.shadowColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.4)`;
        ctx.fill();
      }

      animId = requestAnimationFrame(drawStars);
    };

    animId = requestAnimationFrame(drawStars);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, [enableStars, rgb]);

  return (
    <div
      ref={cardRef}
      className={`${styles.magicBentoCard} ${className}`.trim()}
      onClick={handleClick}
      style={{
        '--mb-glow-rgb': `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`,
        ...style,
      }}
      {...props}
    >
      {/* 1. Cursor Spotlight Light */}
      {enableSpotlight && <span className={styles.magicBentoLight} aria-hidden="true" />}

      {/* 2. Twinkling Ambient Stars Canvas */}
      {enableStars && <canvas ref={canvasRef} className={styles.magicBentoStars} aria-hidden="true" />}

      {/* 3. Card Content */}
      <div className={styles.magicBentoContent}>{children}</div>

      {/* 4. Subtle Ambient Glass Rim */}
      <span className={styles.magicBentoRim} aria-hidden="true" />

      {/* 5. Cursor-Following Neon Border Glow */}
      {enableBorderGlow && <span className={styles.magicBentoBorder} aria-hidden="true" />}
    </div>
  );
}
