import React, { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '../../lib/utils';

interface ParticlesProps {
  className?: string;
  quantity?: number;
  staticity?: number;
  ease?: number;
  size?: number;
  refresh?: boolean;
  color?: string;
  vx?: number;
  vy?: number;
}

interface Circle {
  x: number;
  y: number;
  translateX: number;
  translateY: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  dx: number;
  dy: number;
  magnetism: number;
}

function hexToRgb(hex: string): number[] {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split('')
      .map((char) => char + char)
      .join('');
  }
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return [255, 255, 255];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export const Particles: React.FC<ParticlesProps> = ({
  className = '',
  quantity = 35,
  staticity = 50,
  ease = 50,
  size = 0.5,
  refresh = false,
  color = '#E7EFE8',
  vx = 0,
  vy = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const context = useRef<CanvasRenderingContext2D | null>(null);
  const circles = useRef<Circle[]>([]);
  const mouse = useRef({ x: 0, y: 0 });
  const canvasSize = useRef({ w: 0, h: 0 });
  const animationFrameId = useRef<number | null>(null);

  // Initialize prefers-reduced-motion without synchronous setState in effect
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  const circleParams = useCallback((): Circle => {
    const x = Math.floor(Math.random() * (canvasSize.current.w || 300));
    const y = Math.floor(Math.random() * (canvasSize.current.h || 150));
    const translateX = 0;
    const translateY = 0;
    const pSize = Math.floor(Math.random() * 2) + size;
    const alpha = parseFloat((Math.random() * 0.4 + 0.25).toFixed(2));
    const targetAlpha = parseFloat((Math.random() * 0.4 + 0.45).toFixed(2));
    const dx = (Math.random() - 0.5) * 0.2;
    const dy = (Math.random() - 0.5) * 0.2;
    const magnetism = 0.1 + Math.random() * 3;
    return {
      x,
      y,
      translateX,
      translateY,
      size: pSize,
      alpha,
      targetAlpha,
      dx,
      dy,
      magnetism,
    };
  }, [size]);

  const drawCircle = useCallback((circle: Circle) => {
    if (context.current) {
      const { x, y, translateX, translateY, size: circleSize, alpha } = circle;
      context.current.translate(translateX, translateY);
      context.current.beginPath();
      context.current.arc(x, y, circleSize, 0, 2 * Math.PI);
      const rgb = hexToRgb(color);
      context.current.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
      context.current.fill();
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      context.current.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }, [color]);

  const clearContext = useCallback(() => {
    if (context.current) {
      context.current.clearRect(
        0,
        0,
        canvasSize.current.w,
        canvasSize.current.h
      );
    }
  }, []);

  const initCanvas = useCallback(() => {
    if (canvasContainerRef.current && canvasRef.current && context.current) {
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      canvasSize.current.w = canvasContainerRef.current.offsetWidth;
      canvasSize.current.h = canvasContainerRef.current.offsetHeight;

      canvasRef.current.width = canvasSize.current.w * dpr;
      canvasRef.current.height = canvasSize.current.h * dpr;
      canvasRef.current.style.width = `${canvasSize.current.w}px`;
      canvasRef.current.style.height = `${canvasSize.current.h}px`;
      context.current.scale(dpr, dpr);

      const effectiveQuantity = canvasSize.current.w < 640 ? Math.max(12, Math.round(quantity * 0.6)) : quantity;
      circles.current = [];
      for (let i = 0; i < effectiveQuantity; i++) {
        circles.current.push(circleParams());
      }
    }
  }, [quantity, circleParams]);

  useEffect(() => {
    if (canvasRef.current) {
      context.current = canvasRef.current.getContext('2d');
    }
    initCanvas();

    if (prefersReducedMotion) {
      // Draw single static frame
      clearContext();
      circles.current.forEach((circle) => {
        circle.alpha = circle.targetAlpha * 0.7;
        drawCircle(circle);
      });
      return;
    }

    // Animation loop encapsulated within effect
    let isCancelled = false;
    const renderLoop = () => {
      if (isCancelled) return;
      clearContext();

      circles.current.forEach((circle) => {
        if (circle.alpha < circle.targetAlpha) {
          circle.alpha += 0.01;
        }

        circle.x += circle.dx + vx;
        circle.y += circle.dy + vy;
        circle.translateX +=
          (mouse.current.x / (staticity / circle.magnetism) - circle.translateX) /
          ease;
        circle.translateY +=
          (mouse.current.y / (staticity / circle.magnetism) - circle.translateY) /
          ease;

        // Wrap around bounds
        if (circle.x < -circle.size) circle.x = canvasSize.current.w + circle.size;
        if (circle.x > canvasSize.current.w + circle.size) circle.x = -circle.size;
        if (circle.y < -circle.size) circle.y = canvasSize.current.h + circle.size;
        if (circle.y > canvasSize.current.h + circle.size) circle.y = -circle.size;

        drawCircle(circle);
      });

      animationFrameId.current = window.requestAnimationFrame(renderLoop);
    };

    renderLoop();

    const handleResize = () => {
      initCanvas();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isCancelled = true;
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) {
        window.cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [initCanvas, clearContext, drawCircle, prefersReducedMotion, staticity, ease, vx, vy, refresh]);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (canvasContainerRef.current && !prefersReducedMotion) {
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const { w, h } = canvasSize.current;
      const x = e.clientX - rect.left - w / 2;
      const y = e.clientY - rect.top - h / 2;
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (inside) {
        mouse.current.x = x;
        mouse.current.y = y;
      }
    }
  };

  return (
    <div
      ref={canvasContainerRef}
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      onMouseMove={onMouseMove}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
