'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './TiltedCard.module.css';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const parseColor = (value) => {
  const text = String(value || '').trim();
  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text);
  if (hex) {
    const full = hex[1].length === 3 ? hex[1].replace(/./g, (digit) => digit + digit) : hex[1];
    return [0, 2, 4].map((index) => parseInt(full.slice(index, index + 2), 16));
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(text);
  if (rgb) return [rgb[1], rgb[2], rgb[3]].map((channel) => clamp(Math.round(parseFloat(channel)), 0, 255));
  return null;
};

const toLength = (value) => (typeof value === 'number' ? `${value}px` : value);

const smoother = (t) => {
  const x = clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

const step = (state, key, target, omega, zeta, dt) => {
  const velocity = `v${key}`;
  const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / steps;
  for (let index = 0; index < steps; index++) {
    state[velocity] += (omega * omega * (target - state[key]) - 2 * zeta * omega * state[velocity]) * h;
    state[key] += state[velocity] * h;
  }
  const settled = Math.abs(target - state[key]) < 0.001 && Math.abs(state[velocity]) < 0.01;
  if (settled) {
    state[key] = target;
    state[velocity] = 0;
  }
  return !settled;
};

export const TiltedCardLayer = ({ depth = 20, className = '', style, children }) => (
  <div className={`${styles.tiltedCardLayer} ${className}`.trim()} style={{ '--tc-depth': depth, ...style }}>
    {children}
  </div>
);

const TiltedCard = ({
  imageSrc,
  altText = 'Tilted card image',
  captionText = '',
  containerHeight = 'auto',
  containerWidth = '100%',
  imageHeight = 'auto',
  imageWidth = '100%',
  scaleOnHover = 1.02,
  rotateAmplitude = 10,
  showTooltip = false,
  overlayContent = null,
  displayOverlayContent = false,
  overlayDepth = 30,
  children,
  backContent = null,
  flipOnClick = false,
  flipped,
  onFlip,
  radius = 24,
  perspective = 900,
  smoothness = 0.65,
  glare = 0.45,
  glareColor = '#E51C23',
  shadow = 0.4,
  parallax = 1,
  axis = 'both',
  reverse = false,
  trackWindow = false,
  floating = false,
  gyroscope = true,
  intro = true,
  introDelay = 0,
  onClick,
  className = '',
  style,
}) => {
  const figureRef = useRef(null);
  const bodyRef = useRef(null);
  const shadowRef = useRef(null);
  const captionRef = useRef(null);
  const wakeRef = useRef(null);
  const flipRef = useRef(null);
  const [innerFlipped, setInnerFlipped] = useState(false);
  const controlled = typeof flipped === 'boolean';
  const isFlipped = Boolean(backContent) && (controlled ? flipped : innerFlipped);

  const settings = {
    amplitude: clamp(rotateAmplitude, 0, 60),
    scale: Math.max(0.5, scaleOnHover),
    smoothness: clamp(smoothness, 0, 1),
    glare: clamp(glare, 0, 1),
    shadow: clamp(shadow, 0, 1),
    parallax: Math.max(0, parallax),
    axis,
    reverse,
    trackWindow,
    floating,
    gyroscope,
    intro,
    introDelay: Math.max(0, introDelay),
    flippable: Boolean(backContent) && flipOnClick,
    interactive: (Boolean(backContent) && flipOnClick) || Boolean(onClick),
    flipped: isFlipped,
    tooltip: showTooltip && Boolean(captionText),
  };
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    wakeRef.current?.();
  });

  useEffect(() => {
    const figure = figureRef.current;
    const body = bodyRef.current;
    if (!figure || !body) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const state = {
      rx: 0,
      vrx: 0,
      ry: 0,
      vry: 0,
      lift: 0,
      vlift: 0,
      ty: 0,
      vty: 0,
      flip: 0,
      vflip: 0,
      press: 0,
      vpress: 0,
      tip: 0,
      vtip: 0,
      shown: 0,
      vshown: 0,
      tx: 0,
      tyy: 0,
    };
    const pointer = { nx: 0, ny: 0, x: 0, y: 0, inside: false, mouse: false, seen: false, vx: 0, last: 0 };
    const press = { active: false, x: 0, y: 0, moved: false };
    const tilt = { gamma: 0, beta: 0, baseGamma: 0, baseBeta: 0, calibrated: false, live: false, asked: false };
    let opacity = 1;
    let entered = true;
    let introAt = -1;
    let time = Math.random() * 10;
    let focused = false;
    let raf = 0;
    let last = 0;
    let visible = true;

    if (settingsRef.current.intro && !reduced) {
      entered = false;
      opacity = 0;
      state.rx = 8;
      state.ty = 12;
      body.style.opacity = '0';
    }

    const frame = (now) => {
      raf = 0;
      const s = settingsRef.current;
      const dt = clamp((now - last) / 1000 || 0, 0, 0.05);
      last = Math.max(last, now);
      time += dt;

      if (!entered && now >= introAt) {
        entered = true;
      }

      const rate = 1 - Math.pow(1 - s.smoothness, 3);
      const omega = 12 + 20 * (1 - rate);
      const zeta = 0.75 + 0.15 * (1 - rate);

      let targetRx = 0;
      let targetRy = 0;
      let targetLift = 0;

      if (pointer.inside || focused) {
        targetRx = (s.reverse ? 1 : -1) * pointer.ny * s.amplitude;
        targetRy = (s.reverse ? -1 : 1) * pointer.nx * s.amplitude;
        targetLift = 1;
      }

      if (s.axis === 'x') targetRy = 0;
      if (s.axis === 'y') targetRx = 0;

      step(state, 'rx', targetRx, omega, zeta, dt);
      step(state, 'ry', targetRy, omega, zeta, dt);
      step(state, 'lift', targetLift, omega, zeta, dt);

      const currentScale = 1 + (s.scale - 1) * state.lift;
      const shadowEl = shadowRef.current;

      body.style.transform = `perspective(${toLength(perspective)}) rotateX(${state.rx.toFixed(2)}deg) rotateY(${state.ry.toFixed(2)}deg) scale3d(${currentScale.toFixed(3)}, ${currentScale.toFixed(3)}, 1)`;

      if (shadowEl) {
        shadowEl.style.transform = `translate3d(0, ${(state.lift * 12).toFixed(1)}px, 0) scale(${(1 + state.lift * 0.04).toFixed(3)})`;
        shadowEl.style.opacity = (state.lift * s.shadow * 0.7).toFixed(2);
      }

      // Glare position calculation
      const gx = clamp(50 + pointer.nx * 40, 0, 100);
      const gy = clamp(50 + pointer.ny * 40, 0, 100);
      body.style.setProperty('--tc-gx', `${gx}%`);
      body.style.setProperty('--tc-gy', `${gy}%`);
      body.style.setProperty('--tc-glare', (state.lift * s.glare).toFixed(2));
      body.style.setProperty('--tc-px', pointer.nx.toFixed(3));
      body.style.setProperty('--tc-py', pointer.ny.toFixed(3));

      if (!entered) {
        opacity = clamp(opacity + dt * 2.5, 0, 1);
        body.style.opacity = opacity.toFixed(2);
      } else {
        body.style.opacity = '1';
      }

      const active = state.lift > 0.01 || Math.abs(state.rx) > 0.1 || Math.abs(state.ry) > 0.1;
      if (active || !entered) {
        raf = requestAnimationFrame(frame);
      }
    };

    const wake = () => {
      if (!raf && visible) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    wakeRef.current = wake;

    const onEnter = () => {
      pointer.inside = true;
      wake();
    };

    const onMove = (e) => {
      const rect = figure.getBoundingClientRect();
      const x = clamp(e.clientX - rect.left, 0, rect.width);
      const y = clamp(e.clientY - rect.top, 0, rect.height);
      pointer.nx = (x / rect.width - 0.5) * 2;
      pointer.ny = (y / rect.height - 0.5) * 2;
      pointer.inside = true;
      wake();
    };

    const onLeave = () => {
      pointer.inside = false;
      pointer.nx = 0;
      pointer.ny = 0;
      wake();
    };

    figure.addEventListener('pointerenter', onEnter);
    figure.addEventListener('pointermove', onMove);
    figure.addEventListener('pointerleave', onLeave);

    wake();

    return () => {
      cancelAnimationFrame(raf);
      wakeRef.current = null;
      figure.removeEventListener('pointerenter', onEnter);
      figure.removeEventListener('pointermove', onMove);
      figure.removeEventListener('pointerleave', onLeave);
    };
  }, [perspective]);

  const corner = toLength(radius);
  const glareRgb = (parseColor(glareColor) || [229, 28, 35]).join(', ');

  return (
    <figure
      ref={figureRef}
      className={`${styles.tiltedCard} ${className}`.trim()}
      style={{
        width: toLength(containerWidth),
        height: toLength(containerHeight),
        ...style,
      }}
      onClick={onClick}
    >
      <div
        ref={shadowRef}
        className={styles.tiltedCardShadow}
        aria-hidden="true"
        style={{
          width: toLength(imageWidth),
          height: toLength(imageHeight),
          borderRadius: corner,
        }}
      />
      <div
        ref={bodyRef}
        className={styles.tiltedCardBody}
        style={{
          width: toLength(imageWidth),
          height: toLength(imageHeight),
          '--tc-radius': corner,
          '--tc-glare-rgb': glareRgb,
        }}
      >
        <div className={`${styles.tiltedCardFace} ${styles.tiltedCardFront}`}>
          {imageSrc && (
            <img
              className={styles.tiltedCardImg}
              src={imageSrc}
              alt={altText}
              draggable={false}
              style={{
                width: '100%',
                height: '100%',
              }}
            />
          )}
          {children}
          <span className={styles.tiltedCardGlare} aria-hidden="true" />
          <span className={styles.tiltedCardRim} aria-hidden="true" />
          <span className={styles.tiltedCardEdge} aria-hidden="true" />
        </div>
        {displayOverlayContent && overlayContent && (
          <div className={styles.tiltedCardOverlay} style={{ '--tc-lift': `${overlayDepth}px` }}>
            {overlayContent}
          </div>
        )}
      </div>
      {showTooltip && captionText && (
        <figcaption ref={captionRef} className={styles.tiltedCardCaption}>
          {captionText}
        </figcaption>
      )}
    </figure>
  );
};

export default TiltedCard;
