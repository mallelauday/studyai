/**
 * @fileoverview useWindowSize - Responsive screen detection hook for StudyAI
 *
 * Tracks the browser window dimensions and exposes Tailwind-aligned
 * breakpoint helpers so components can react to layout changes without
 * CSS-only solutions.
 *
 * Breakpoints mirror Tailwind CSS v3/v4 defaults:
 *   sm  ≥ 640px
 *   md  ≥ 768px
 *   lg  ≥ 1024px
 *   xl  ≥ 1280px
 *   2xl ≥ 1536px
 *
 * @module hooks/useWindowSize
 */

import { useState, useEffect } from 'react';

/** @type {Record<string, number>} */
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

/**
 * @typedef {Object} WindowSize
 * @property {number}  width         - Current viewport width in px.
 * @property {number}  height        - Current viewport height in px.
 * @property {boolean} isMobile      - true when width < 768 (md).
 * @property {boolean} isTablet      - true when 768 ≤ width < 1024.
 * @property {boolean} isDesktop     - true when width ≥ 1024.
 * @property {boolean} isSm          - true when width ≥ 640.
 * @property {boolean} isMd          - true when width ≥ 768.
 * @property {boolean} isLg          - true when width ≥ 1024.
 * @property {boolean} isXl          - true when width ≥ 1280.
 * @property {boolean} is2Xl         - true when width ≥ 1536.
 * @property {string}  breakpoint    - Active breakpoint label.
 */

/**
 * Returns the current window size and Tailwind-aligned breakpoint helpers.
 * Uses a `ResizeObserver` on the `<body>` element which is more efficient
 * than listening to the `resize` event on `window`.
 *
 * @returns {WindowSize}
 *
 * @example
 * const { isMobile, isDesktop, width } = useWindowSize();
 * return isMobile ? <MobileNav /> : <DesktopSidebar />;
 */
export function useWindowSize() {
  const getSize = () => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  const [size, setSize] = useState(getSize);

  useEffect(() => {
    let rafId;

    const update = () => {
      rafId = requestAnimationFrame(() => setSize(getSize()));
    };

    // ResizeObserver is more performant than window 'resize'
    let observer;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(update);
      observer.observe(document.documentElement);
    } else {
      window.addEventListener('resize', update, { passive: true });
    }

    return () => {
      cancelAnimationFrame(rafId);
      observer
        ? observer.disconnect()
        : window.removeEventListener('resize', update);
    };
  }, []);

  const { width, height } = size;

  /** Resolves the human-readable breakpoint label for a given width. */
  const getBreakpoint = (w) => {
    if (w >= BREAKPOINTS['2xl']) return '2xl';
    if (w >= BREAKPOINTS.xl) return 'xl';
    if (w >= BREAKPOINTS.lg) return 'lg';
    if (w >= BREAKPOINTS.md) return 'md';
    if (w >= BREAKPOINTS.sm) return 'sm';
    return 'xs';
  };

  return {
    width,
    height,
    isMobile: width < BREAKPOINTS.md,
    isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isDesktop: width >= BREAKPOINTS.lg,
    isSm: width >= BREAKPOINTS.sm,
    isMd: width >= BREAKPOINTS.md,
    isLg: width >= BREAKPOINTS.lg,
    isXl: width >= BREAKPOINTS.xl,
    is2Xl: width >= BREAKPOINTS['2xl'],
    breakpoint: getBreakpoint(width),
  };
}
