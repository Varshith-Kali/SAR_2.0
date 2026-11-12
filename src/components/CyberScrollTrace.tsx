import React, { useEffect, useRef, useState } from 'react';

export interface ScrollTraceCheckpoint {
  id: string;
  code: string;
  label: string;
  /** Normalized position along the path (0.26 to 0.88) */
  ratio: number;
}

interface CyberScrollTraceProps {
  activeView: string;
  stageKey?: string | number;
  completionPercentage?: number;
}

let activeScrollAnimRaf: number | null = null;

/**
 * Hardware-synced RAF smooth scroll with easeOutCubic curve.
 * Automatically yields if the user manually wheels or touches during the glide.
 */
export function smoothScrollToY(targetY: number, durationMs = 220): void {
  if (typeof window === 'undefined') return;
  if (activeScrollAnimRaf !== null) {
    window.cancelAnimationFrame(activeScrollAnimRaf);
    activeScrollAnimRaf = null;
  }

  const startY = window.scrollY || document.documentElement.scrollTop || 0;
  const clampedTarget = Math.max(0, targetY);
  const delta = clampedTarget - startY;

  if (Math.abs(delta) <= 4 || durationMs <= 0) {
    window.scrollTo({ top: clampedTarget, left: 0, behavior: 'instant' as ScrollBehavior });
    document.documentElement.scrollTop = clampedTarget;
    document.body.scrollTop = clampedTarget;
    return;
  }

  const startTime = performance.now();
  const cancelOnUserInput = () => {
    if (activeScrollAnimRaf !== null) {
      window.cancelAnimationFrame(activeScrollAnimRaf);
      activeScrollAnimRaf = null;
    }
    window.removeEventListener('wheel', cancelOnUserInput);
    window.removeEventListener('touchstart', cancelOnUserInput);
  };

  window.addEventListener('wheel', cancelOnUserInput, { passive: true, once: true });
  window.addEventListener('touchstart', cancelOnUserInput, { passive: true, once: true });

  const step = (now: number) => {
    const elapsed = now - startTime;
    const progress = Math.min(1, Math.max(0, elapsed / durationMs));
    // Cubic ease-out for immediate response and silky deceleration
    const eased = 1 - Math.pow(1 - progress, 3);
    const nextY = startY + delta * eased;

    window.scrollTo({ top: nextY, left: 0, behavior: 'instant' as ScrollBehavior });

    if (progress < 1) {
      activeScrollAnimRaf = window.requestAnimationFrame(step);
    } else {
      activeScrollAnimRaf = null;
      window.scrollTo({ top: clampedTarget, left: 0, behavior: 'instant' as ScrollBehavior });
      document.documentElement.scrollTop = clampedTarget;
      document.body.scrollTop = clampedTarget;
      window.removeEventListener('wheel', cancelOnUserInput);
      window.removeEventListener('touchstart', cancelOnUserInput);
    }
  };

  activeScrollAnimRaf = window.requestAnimationFrame(step);
}

const VIEW_CHECKPOINTS: Record<string, ScrollTraceCheckpoint[]> = {
  basics: [
    { id: 'sec-basics-identity', code: '01', label: 'Project Scope', ratio: 0.28 },
    { id: 'sec-basics-requirement', code: '02', label: 'Business Requirement', ratio: 0.48 },
    { id: 'sec-basics-cmdb', code: '03', label: 'CMDB Applications', ratio: 0.68 },
    { id: 'sec-basics-datatypes', code: '04', label: 'Data Types', ratio: 0.86 },
  ],
  preliminary: [
    { id: 'sec-prelim-origin', code: 'P1', label: 'Stage Start', ratio: 0.28 },
    { id: 'sec-prelim-stage', code: 'P2', label: 'Upper Questions', ratio: 0.48 },
    { id: 'sec-prelim-rules', code: 'P3', label: 'Lower Questions', ratio: 0.68 },
    { id: 'sec-prelim-next', code: 'P4', label: 'Stage Navigation', ratio: 0.86 },
  ],
  modules: [
    { id: 'sec-mod-origin', code: 'M1', label: 'Section Start', ratio: 0.28 },
    { id: 'sec-mod-controls', code: 'M2', label: 'Upper Controls', ratio: 0.48 },
    { id: 'sec-mod-questions', code: 'M3', label: 'Lower Controls', ratio: 0.68 },
    { id: 'sec-mod-evidence', code: 'M4', label: 'Section Navigation', ratio: 0.86 },
  ],
  flow: [
    { id: 'sec-flow-header', code: 'F1', label: 'System Overview', ratio: 0.28 },
    { id: 'sec-flow-what', code: 'F2', label: 'WHAT & WHO Flow', ratio: 0.48 },
    { id: 'sec-flow-how', code: 'F3', label: 'HOW & WHERE Flow', ratio: 0.68 },
    { id: 'sec-flow-footer', code: 'F4', label: 'Proceed to Review', ratio: 0.86 },
  ],
  review: [
    { id: 'sec-rev-origin', code: 'R1', label: 'Review Header', ratio: 0.28 },
    { id: 'sec-rev-export', code: 'R2', label: 'Export Package', ratio: 0.48 },
    { id: 'sec-rev-workbook', code: 'R3', label: 'Excel Preview', ratio: 0.68 },
    { id: 'sec-rev-signoff', code: 'R4', label: 'Submit SAR', ratio: 0.86 },
  ],
};

// Signature curvy SVG trace path across all tabs and sections
const SVG_PATH_D =
  'M 20 24 C 20 78, 44 86, 44 138 L 44 624 C 44 666, 24 676, 24 714';

// Sticky header offset so scrolled target cards/sections sit cleanly below the top navigation bar
const STICKY_HEADER_OFFSET = 88;
const LUT_STEPS = 200;

interface ResolvedCheckpointStop {
  scrollTop: number;
  label: string;
}

/**
 * Dynamically computes 4 strictly monotonic scroll stops (S_0 < S_1 < S_2 < S_3)
 * and matching labels for the current view so clicking P1..P4 or M1..M4 lands the
 * scroll cursor dead-center on that checkpoint node and positions the target question
 * card cleanly below the sticky header.
 */
function resolveViewCheckpointStops(
  activeView: string,
  checkpoints: ScrollTraceCheckpoint[],
  maxScroll: number
): ResolvedCheckpointStop[] {
  const getElementScrollTop = (el: HTMLElement): number => {
    const rect = el.getBoundingClientRect();
    const currentScroll = window.scrollY || document.documentElement.scrollTop || 0;
    const rawTop = rect.top + currentScroll - STICKY_HEADER_OFFSET;
    return Math.min(maxScroll, Math.max(0, rawTop));
  };

  const rawStops: ResolvedCheckpointStop[] = [];

  if (activeView === 'preliminary' || activeView === 'modules') {
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>('[data-scroll-card="true"]')
    );
    const footerId =
      activeView === 'preliminary' ? 'sec-prelim-next' : 'sec-mod-evidence';
    const footerEl = document.getElementById(footerId);

    if (cards.length >= 3) {
      const idx0 = 0;
      const idx1 = Math.max(1, Math.floor((cards.length - 1) * 0.34));
      const idx2 = Math.max(idx1 + 1, Math.floor((cards.length - 1) * 0.68));
      const pickedIndices = [idx0, idx1, Math.min(cards.length - 1, idx2)];

      pickedIndices.forEach((cardIdx, i) => {
        const card = cards[cardIdx];
        const cardLabel =
          card?.getAttribute('data-scroll-label') || checkpoints[i]?.label || '';
        rawStops.push({
          scrollTop: card ? getElementScrollTop(card) : maxScroll * ((i + 1) * 0.22),
          label: cardLabel,
        });
      });

      const lastCard = cards[cards.length - 1];
      const fourthTarget = footerEl || lastCard;
      rawStops.push({
        scrollTop: fourthTarget
          ? Math.min(maxScroll, Math.max(getElementScrollTop(fourthTarget), maxScroll * 0.82))
          : maxScroll * 0.88,
        label: checkpoints[3]?.label || 'Stage Navigation',
      });
    }
  }

  // Fallback or standard section landmark resolution for basics / flow / review
  if (rawStops.length < 4) {
    rawStops.length = 0;
    checkpoints.forEach((cp, idx) => {
      const el = document.getElementById(cp.id);
      const fallbackScroll = maxScroll * ((cp.ratio - 0.16) / 0.84);
      rawStops.push({
        scrollTop: el ? getElementScrollTop(el) : fallbackScroll,
        label: cp.label,
      });
      if (idx === 0 && rawStops[0].scrollTop < Math.min(48, maxScroll * 0.08)) {
        rawStops[0].scrollTop = Math.min(48, maxScroll * 0.12);
      }
    });
  }

  // Enforce strict monotonicity (S_0 < S_1 < S_2 < S_3) across [0, maxScroll]
  const minGap = Math.max(12, maxScroll * 0.08);
  for (let i = 0; i < rawStops.length; i++) {
    const defaultStop = maxScroll * ((checkpoints[i].ratio - 0.16) / 0.84);
    if (!Number.isFinite(rawStops[i].scrollTop)) {
      rawStops[i].scrollTop = defaultStop;
    }
    if (i === 0) {
      rawStops[i].scrollTop = Math.max(
        Math.min(36, maxScroll * 0.1),
        Math.min(rawStops[i].scrollTop, maxScroll * 0.32)
      );
    } else {
      const prev = rawStops[i - 1].scrollTop;
      if (rawStops[i].scrollTop <= prev + minGap) {
        rawStops[i].scrollTop = Math.min(maxScroll, prev + minGap);
      }
    }
  }

  // If clamping pushed stops past maxScroll, backward-adjust so all 4 remain distinct
  for (let i = rawStops.length - 1; i >= 0; i--) {
    const upperBound =
      i === rawStops.length - 1
        ? Math.max(0, maxScroll - Math.min(20, maxScroll * 0.04))
        : rawStops[i + 1].scrollTop - Math.max(6, maxScroll * 0.05);
    if (rawStops[i].scrollTop > upperBound) {
      rawStops[i].scrollTop = Math.max(0, upperBound);
    }
  }

  return rawStops;
}

/**
 * Piecewise-linear interpolation mapping scrollTop -> visualRatio along the SVG path
 * so that scrollTop === S_i maps to visualRatio === checkpoints[i].ratio (0.28, 0.48, 0.68, 0.86).
 */
function computePiecewiseVisualRatio(
  scrollTop: number,
  maxScroll: number,
  stops: ResolvedCheckpointStop[],
  checkpoints: ScrollTraceCheckpoint[]
): number {
  if (maxScroll <= 4 || stops.length !== checkpoints.length) {
    const rawRatio = Math.min(1, Math.max(0, scrollTop / Math.max(1, maxScroll)));
    return 0.16 + rawRatio * 0.84;
  }

  const anchors: Array<{ s: number; r: number }> = [
    { s: 0, r: 0.16 },
    ...stops.map((stop, i) => ({ s: stop.scrollTop, r: checkpoints[i].ratio })),
    { s: maxScroll, r: 1.0 },
  ];

  if (scrollTop <= 0) return 0.16;
  if (scrollTop >= maxScroll) return 1.0;

  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (scrollTop >= a.s && scrollTop <= b.s) {
      const span = b.s - a.s;
      if (span <= 0.5) return b.r;
      const t = (scrollTop - a.s) / span;
      return a.r + t * (b.r - a.r);
    }
  }

  return 0.16 + Math.min(1, Math.max(0, scrollTop / maxScroll)) * 0.84;
}

/**
 * Interactive Scroll Trace Rail (Left Viewport Margin)
 * 120fps zero-layout-thrash scroll tracker with precomputed SVG LUT and cached stops.
 */
export const CyberScrollTrace: React.FC<CyberScrollTraceProps> = ({
  activeView,
  stageKey,
}) => {
  const pathRef = useRef<SVGPathElement | null>(null);
  const activeTraceRef = useRef<SVGPathElement | null>(null);
  const leadCursorRef = useRef<SVGGElement | null>(null);
  const pathLutRef = useRef<Array<{ x: number; y: number }>>([]);
  const reachedMaskRef = useRef<number>(-1);
  const stopsRef = useRef<ResolvedCheckpointStop[]>([]);
  const maxScrollRef = useRef<number>(1);

  const [reachedCount, setReachedCount] = useState<number>(0);
  const [atBottomTerminal, setAtBottomTerminal] = useState<boolean>(false);
  const [checkpointCoords, setCheckpointCoords] = useState<
    Array<ScrollTraceCheckpoint & { x: number; y: number }>
  >([]);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [dynamicLabels, setDynamicLabels] = useState<string[]>([]);

  const checkpoints = VIEW_CHECKPOINTS[activeView] || VIEW_CHECKPOINTS.basics;

  // Measure SVG path once & build a 201-point O(1) lookup table so scroll frames never call getPointAtLength
  useEffect(() => {
    const pathEl = pathRef.current;
    if (!pathEl) return;
    try {
      const len = pathEl.getTotalLength();
      if (pathLutRef.current.length === 0) {
        const lut: Array<{ x: number; y: number }> = [];
        for (let i = 0; i <= LUT_STEPS; i++) {
          const pt = pathEl.getPointAtLength((len * i) / LUT_STEPS);
          lut.push({ x: pt.x, y: pt.y });
        }
        pathLutRef.current = lut;
      }
      const computed = checkpoints.map((cp) => {
        const pt = pathEl.getPointAtLength(len * cp.ratio);
        return { ...cp, x: pt.x, y: pt.y };
      });
      setCheckpointCoords(computed);
    } catch {
      const computed = checkpoints.map((cp) => ({
        ...cp,
        x: 44,
        y: 24 + 690 * cp.ratio,
      }));
      setCheckpointCoords(computed);
    }
  }, [activeView, checkpoints]);

  // Fast O(1) lookup of {x, y} along the curvy SVG path
  const getPointAtRatio = (ratio: number): { x: number; y: number } => {
    const lut = pathLutRef.current;
    if (lut.length <= 1) {
      return { x: 44, y: 24 + 690 * ratio };
    }
    const clamped = Math.min(1, Math.max(0, ratio));
    const exactIdx = clamped * LUT_STEPS;
    const i0 = Math.floor(exactIdx);
    const i1 = Math.min(LUT_STEPS, i0 + 1);
    const frac = exactIdx - i0;
    const p0 = lut[i0];
    const p1 = lut[i1];
    return {
      x: p0.x + (p1.x - p0.x) * frac,
      y: p0.y + (p1.y - p0.y) * frac,
    };
  };

  // Zero-layout-read RAF scroll tracker (layout stops are cached on view/stage/resize only)
  useEffect(() => {
    let scrollRafId: number | null = null;
    let layoutTimerId: number | null = null;

    const updateScrollPositionOnly = () => {
      scrollRafId = null;
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      const maxScroll = maxScrollRef.current;
      const resolvedStops = stopsRef.current;

      const visualRatio = computePiecewiseVisualRatio(
        scrollTop,
        maxScroll,
        resolvedStops,
        checkpoints
      );

      if (activeTraceRef.current) {
        const insetBottom = Math.max(0, 100 - visualRatio * 100);
        activeTraceRef.current.style.clipPath = `inset(0 0 ${insetBottom.toFixed(2)}% 0)`;
      }

      if (leadCursorRef.current) {
        const pt = getPointAtRatio(visualRatio);
        leadCursorRef.current.setAttribute(
          'transform',
          `translate(${pt.x.toFixed(1)}, ${pt.y.toFixed(1)})`
        );
      }

      let nextReached = 0;
      for (let i = 0; i < checkpoints.length; i++) {
        if (visualRatio + 0.008 >= checkpoints[i].ratio) {
          nextReached = i + 1;
        }
      }
      const nextBottom = visualRatio >= 0.97 ? 1 : 0;
      const combinedMask = nextReached * 10 + nextBottom;
      if (combinedMask !== reachedMaskRef.current) {
        reachedMaskRef.current = combinedMask;
        setReachedCount(nextReached);
        setAtBottomTerminal(nextBottom === 1);
      }
    };

    const recomputeStopsAndSync = () => {
      const docHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
      const winHeight = window.innerHeight || 1;
      const maxScroll = Math.max(1, docHeight - winHeight);
      maxScrollRef.current = maxScroll;

      const resolvedStops = resolveViewCheckpointStops(
        activeView,
        checkpoints,
        maxScroll
      );
      stopsRef.current = resolvedStops;
      setDynamicLabels(resolvedStops.map((s) => s.label));
      updateScrollPositionOnly();
    };

    const onScroll = () => {
      if (scrollRafId === null) {
        scrollRafId = window.requestAnimationFrame(updateScrollPositionOnly);
      }
    };

    const onResize = () => {
      if (layoutTimerId !== null) window.clearTimeout(layoutTimerId);
      layoutTimerId = window.setTimeout(recomputeStopsAndSync, 60);
    };

    recomputeStopsAndSync();
    // Re-measure once after view/stage transition settles
    const settleTimer = window.setTimeout(recomputeStopsAndSync, 180);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (layoutTimerId !== null) window.clearTimeout(layoutTimerId);
        layoutTimerId = window.setTimeout(recomputeStopsAndSync, 90);
      });
      resizeObserver.observe(document.body);
    }

    return () => {
      if (scrollRafId !== null) window.cancelAnimationFrame(scrollRafId);
      if (layoutTimerId !== null) window.clearTimeout(layoutTimerId);
      window.clearTimeout(settleTimer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      resizeObserver?.disconnect();
    };
  }, [activeView, stageKey, checkpoints]);

  const handleJumpToSection = (cp: ScrollTraceCheckpoint, idx: number) => {
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    const winHeight = window.innerHeight || 1;
    const maxScroll = Math.max(1, docHeight - winHeight);
    maxScrollRef.current = maxScroll;

    const freshStops = resolveViewCheckpointStops(activeView, checkpoints, maxScroll);
    stopsRef.current = freshStops;
    setDynamicLabels(freshStops.map((s) => s.label));

    const targetStop = freshStops[idx];
    if (targetStop !== undefined) {
      smoothScrollToY(targetStop.scrollTop, 250);
      return;
    }

    const normalized = Math.max(0, (cp.ratio - 0.16) / 0.84);
    smoothScrollToY(maxScroll * normalized, 250);
  };

  return (
    <aside
      aria-hidden="true"
      className="hidden xl:flex fixed top-32 bottom-8 left-3 2xl:left-5 w-14 z-30 pointer-events-none flex-col items-center select-none"
    >
      <div className="relative w-full h-full flex items-center justify-center">
        <svg
          viewBox="0 0 76 740"
          fill="none"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full max-h-[680px] overflow-visible"
        >
          {/* Base Reference Path for Geometry Measurement */}
          <path ref={pathRef} d={SVG_PATH_D} stroke="none" fill="none" />

          {/* 1. Unvisited Future Path (Dotted Track) */}
          <path
            d={SVG_PATH_D}
            stroke="currentColor"
            strokeWidth="1.6"
            strokeDasharray="2 10"
            strokeLinecap="round"
            className="text-zinc-300 dark:text-zinc-700"
          />

          {/* 2. Active Scrolled Dashed Trace Line */}
          <path
            ref={activeTraceRef}
            d={SVG_PATH_D}
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeDasharray="7 5"
            style={{
              clipPath: 'inset(0 0 84% 0)',
              willChange: 'clip-path',
            }}
            className="text-zinc-950 dark:text-white"
          />

          {/* 3. Top Origin Target Node (x = 20, y = 24) */}
          <g
            transform="translate(20, 24)"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="pointer-events-auto cursor-pointer"
          >
            <circle
              r="10.5"
              className="fill-white dark:fill-zinc-950 stroke-zinc-950 dark:stroke-white"
              strokeWidth="1.75"
            />
            <circle r="4.2" className="fill-zinc-950 dark:fill-white" />
          </g>

          {/* 4. Section Checkpoint Nodes along the Spine */}
          {checkpointCoords.map((cp, idx) => {
            const isReached = idx < reachedCount;
            const isHovered = hoveredCode === cp.code;
            const displayLabel = dynamicLabels[idx] || cp.label;
            return (
              <g
                key={cp.code}
                transform={`translate(${cp.x}, ${cp.y})`}
                onClick={() => handleJumpToSection(cp, idx)}
                onMouseEnter={() => {
                  const docHeight = Math.max(
                    document.body.scrollHeight,
                    document.documentElement.scrollHeight
                  );
                  const maxScroll = Math.max(1, docHeight - (window.innerHeight || 1));
                  const fresh = resolveViewCheckpointStops(
                    activeView,
                    checkpoints,
                    maxScroll
                  );
                  setDynamicLabels(fresh.map((s) => s.label));
                  setHoveredCode(cp.code);
                }}
                onMouseLeave={() => setHoveredCode(null)}
                className="pointer-events-auto cursor-pointer"
              >
                <circle r="14" fill="transparent" />

                <circle
                  r={isReached ? 6.5 : 5}
                  strokeWidth="1.5"
                  className={
                    isReached
                      ? 'fill-white dark:fill-zinc-950 stroke-zinc-950 dark:stroke-white'
                      : 'fill-white dark:fill-zinc-950 stroke-zinc-300 dark:stroke-zinc-700'
                  }
                />

                <circle
                  r={isReached ? 2.8 : 1.8}
                  className={
                    isReached
                      ? 'fill-zinc-950 dark:fill-white'
                      : 'fill-zinc-300 dark:fill-zinc-700'
                  }
                />

                <text
                  x="12"
                  y="3"
                  className={`font-mono text-[9px] font-semibold tracking-wider ${
                    isReached
                      ? 'fill-zinc-800 dark:fill-zinc-200 opacity-90'
                      : 'fill-zinc-400 dark:fill-zinc-600 opacity-60'
                  }`}
                >
                  {cp.code}
                </text>

                {isHovered && (
                  <g transform="translate(30, -10)">
                    <rect
                      x="0"
                      y="0"
                      width={Math.max(115, displayLabel.length * 6.4 + 22)}
                      height="20"
                      rx="4"
                      className="fill-zinc-950 dark:fill-white"
                    />
                    <text
                      x="8"
                      y="13"
                      className="font-mono text-[9.5px] font-semibold fill-white dark:fill-zinc-950"
                    >
                      {cp.code} · {displayLabel}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* 5. Bottom Terminal Node (x = 24, y = 714) */}
          <g
            transform="translate(24, 714)"
            onClick={() =>
              window.scrollTo({
                top: document.documentElement.scrollHeight,
                behavior: 'smooth',
              })
            }
            className="pointer-events-auto cursor-pointer"
          >
            <circle
              r="6.5"
              strokeWidth="1.5"
              className={
                atBottomTerminal
                  ? 'fill-zinc-950 dark:fill-white stroke-zinc-950 dark:stroke-white'
                  : 'fill-white dark:fill-zinc-950 stroke-zinc-300 dark:stroke-zinc-700'
              }
            />
            <circle
              r="2.2"
              className={
                atBottomTerminal
                  ? 'fill-white dark:fill-zinc-950'
                  : 'fill-zinc-300 dark:fill-zinc-700'
              }
            />
          </g>

          {/* 6. Live Moving Scroll Cursor Node */}
          <g ref={leadCursorRef} transform="translate(44, 128)">
            <circle
              r="7.5"
              className="fill-white dark:fill-zinc-950 stroke-zinc-950 dark:stroke-white"
              strokeWidth="1.6"
            />
            <circle r="3.4" className="fill-zinc-950 dark:fill-white" />
          </g>
        </svg>
      </div>
    </aside>
  );
};

/**
 * Signature Vector Node-Trace Accent (`•────────◎`) built for hero headers.
 */
export const CyberNodeUnderline: React.FC<{ className?: string }> = ({
  className = '',
}) => (
  <svg
    viewBox="0 0 260 22"
    fill="none"
    aria-hidden="true"
    className={`w-48 sm:w-60 h-5 ${className}`}
  >
    <circle cx="8" cy="14" r="3.5" className="fill-zinc-950 dark:fill-white" />
    <path
      d="M 11.5 14 L 168 14 C 182 14, 186 6, 200 6 L 244 6"
      stroke="currentColor"
      strokeWidth="1.6"
      className="text-zinc-950 dark:text-white"
    />
    <circle
      cx="250"
      cy="6"
      r="5.5"
      stroke="currentColor"
      strokeWidth="1.5"
      className="fill-white dark:fill-zinc-950 text-zinc-950 dark:text-white"
    />
    <circle cx="250" cy="6" r="2" className="fill-zinc-950 dark:fill-white" />
  </svg>
);

/**
 * Compact Kicker Node-Trace (`•───◦`) for section headers and card badges
 */
export const CyberKickerTrace: React.FC = () => (
  <svg
    viewBox="0 0 36 12"
    fill="none"
    aria-hidden="true"
    className="w-8 h-3 shrink-0"
  >
    <circle cx="3.5" cy="6" r="2.5" className="fill-zinc-950 dark:fill-white" />
    <line
      x1="6"
      y1="6"
      x2="26"
      y2="6"
      stroke="currentColor"
      strokeWidth="1.5"
      className="text-zinc-950 dark:text-white"
    />
    <circle
      cx="30"
      cy="6"
      r="3.2"
      stroke="currentColor"
      strokeWidth="1.4"
      className="fill-white dark:fill-zinc-950 text-zinc-950 dark:text-white"
    />
  </svg>
);
