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
  completionPercentage?: number;
}

const VIEW_CHECKPOINTS: Record<string, ScrollTraceCheckpoint[]> = {
  basics: [
    { id: 'sec-basics-identity', code: '01', label: 'Project & Ticket Scope', ratio: 0.28 },
    { id: 'sec-basics-requirement', code: '02', label: 'Business Requirement', ratio: 0.48 },
    { id: 'sec-basics-cmdb', code: '03', label: 'CMDB Topology Links', ratio: 0.68 },
    { id: 'sec-basics-datatypes', code: '04', label: 'Data Classification', ratio: 0.86 },
  ],
  preliminary: [
    { id: 'sec-prelim-origin', code: 'P1', label: 'Preliminary Scope', ratio: 0.28 },
    { id: 'sec-prelim-stage', code: 'P2', label: 'Active Stage Gate', ratio: 0.5 },
    { id: 'sec-prelim-rules', code: 'P3', label: 'Deterministic Unlocks', ratio: 0.72 },
    { id: 'sec-prelim-next', code: 'P4', label: 'Module Verification', ratio: 0.88 },
  ],
  modules: [
    { id: 'sec-mod-origin', code: 'M1', label: 'Module Baseline', ratio: 0.3 },
    { id: 'sec-mod-controls', code: 'M2', label: 'Security Controls', ratio: 0.58 },
    { id: 'sec-mod-evidence', code: 'M3', label: 'Architecture Evidence', ratio: 0.85 },
  ],
  review: [
    { id: 'sec-rev-origin', code: 'R1', label: 'Readiness Gate', ratio: 0.26 },
    { id: 'sec-rev-ai-summary', code: 'R2', label: 'AI SAR Summary', ratio: 0.46 },
    { id: 'sec-rev-workbook', code: 'R3', label: '2-Sheet Excel Preview', ratio: 0.68 },
    { id: 'sec-rev-signoff', code: 'R4', label: 'Submission Seal', ratio: 0.88 },
  ],
};

const SVG_PATH_D =
  'M 20 24 C 20 78, 44 86, 44 138 L 44 624 C 44 666, 24 676, 24 714';

/**
 * Interactive Cybersecurity Scroll Trace Rail (Left Viewport Margin)
 *
 * Performance-tuned for 60/120fps zero-jank scrolling:
 * - Mutates SVG clip-path and cursor node transform directly via DOM refs inside
 *   requestAnimationFrame without triggering React state re-renders on every scroll tick.
 * - Caches SVG total path length so zero layout/geometry reads happen during scroll.
 */
export const CyberScrollTrace: React.FC<CyberScrollTraceProps> = ({
  activeView,
}) => {
  const pathRef = useRef<SVGPathElement | null>(null);
  const activeTraceRef = useRef<SVGPathElement | null>(null);
  const leadCursorRef = useRef<SVGGElement | null>(null);
  const totalLengthRef = useRef<number>(700);
  const reachedMaskRef = useRef<number>(-1);

  const [reachedCount, setReachedCount] = useState<number>(0);
  const [atBottomTerminal, setAtBottomTerminal] = useState<boolean>(false);
  const [checkpointCoords, setCheckpointCoords] = useState<
    Array<ScrollTraceCheckpoint & { x: number; y: number }>
  >([]);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);

  const checkpoints = VIEW_CHECKPOINTS[activeView] || VIEW_CHECKPOINTS.basics;

  // Measure SVG path once per view change & precompute checkpoint coordinates
  useEffect(() => {
    const pathEl = pathRef.current;
    if (!pathEl) return;
    try {
      const len = pathEl.getTotalLength();
      totalLengthRef.current = len;
      const computed = checkpoints.map((cp) => {
        const pt = pathEl.getPointAtLength(len * cp.ratio);
        return { ...cp, x: pt.x, y: pt.y };
      });
      setCheckpointCoords(computed);
    } catch {
      // Fallback if SVG is hidden on small viewports
    }
  }, [activeView, checkpoints]);

  // Zero-re-render RAF scroll tracker
  useEffect(() => {
    let rafId: number | null = null;

    const updateScrollTrace = () => {
      rafId = null;
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      const docHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
      const winHeight = window.innerHeight || 1;
      const maxScroll = Math.max(1, docHeight - winHeight);

      const rawRatio = Math.min(1, Math.max(0, scrollTop / maxScroll));
      const visualRatio = 0.16 + rawRatio * 0.84;

      // 1. Direct DOM update for active path clip-path (zero React re-render)
      if (activeTraceRef.current) {
        const insetBottom = Math.max(0, 100 - visualRatio * 100);
        activeTraceRef.current.style.clipPath = `inset(0 0 ${insetBottom.toFixed(2)}% 0)`;
      }

      // 2. Direct DOM update for lead cursor position along cached path length
      const pathEl = pathRef.current;
      if (pathEl && leadCursorRef.current) {
        try {
          const pt = pathEl.getPointAtLength(totalLengthRef.current * visualRatio);
          leadCursorRef.current.setAttribute(
            'transform',
            `translate(${pt.x.toFixed(1)}, ${pt.y.toFixed(1)})`
          );
        } catch {
          // ignore if hidden
        }
      }

      // 3. Only update React state when a discrete checkpoint threshold is crossed
      let nextReached = 0;
      for (let i = 0; i < checkpoints.length; i++) {
        if (visualRatio + 0.01 >= checkpoints[i].ratio) {
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

    const onScrollOrResize = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(updateScrollTrace);
      }
    };

    updateScrollTrace();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [activeView, checkpoints]);

  const handleJumpToSection = (cp: ScrollTraceCheckpoint) => {
    const targetEl = document.getElementById(cp.id);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const maxScroll = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight
    );
    const normalized = Math.max(0, (cp.ratio - 0.16) / 0.84);
    window.scrollTo({
      top: maxScroll * normalized,
      behavior: 'smooth',
    });
  };

  const responsiveVisibilityClass =
    activeView === 'basics'
      ? 'hidden xl:flex left-3 2xl:left-7'
      : 'hidden 2xl:flex left-4';

  return (
    <aside
      aria-hidden="true"
      className={`fixed top-36 bottom-8 w-14 z-30 pointer-events-none flex-col items-center select-none ${responsiveVisibilityClass}`}
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

          {/* 1. Unvisited Future Path (Dotted Track below current scroll point) */}
          <path
            d={SVG_PATH_D}
            stroke="currentColor"
            strokeWidth="1.6"
            strokeDasharray="2 10"
            strokeLinecap="round"
            className="text-zinc-300 dark:text-zinc-700"
          />

          {/* 2. Active Scrolled Dashed Trace Line (Updated directly via RAF ref) */}
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

          {/* 3. Top Origin Target Node (Concentric Ring + Solid Center Dot) */}
          <g transform="translate(20, 24)">
            <circle
              r="10.5"
              className="fill-white dark:fill-zinc-950 stroke-zinc-950 dark:stroke-white"
              strokeWidth="1.75"
            />
            <circle r="4.2" className="fill-zinc-950 dark:fill-white" />
          </g>

          {/* 4. Section Checkpoint Nodes along the Vertical Spine */}
          {checkpointCoords.map((cp, idx) => {
            const isReached = idx < reachedCount;
            const isHovered = hoveredCode === cp.code;
            return (
              <g
                key={cp.code}
                transform={`translate(${cp.x}, ${cp.y})`}
                onClick={() => handleJumpToSection(cp)}
                onMouseEnter={() => setHoveredCode(cp.code)}
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
                      width={Math.max(115, cp.label.length * 6.4 + 18)}
                      height="20"
                      rx="4"
                      className="fill-zinc-950 dark:fill-white"
                    />
                    <text
                      x="8"
                      y="13"
                      className="font-mono text-[9.5px] font-semibold fill-white dark:fill-zinc-950"
                    >
                      {cp.code} · {cp.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* 5. Bottom Terminal Node */}
          <g transform="translate(24, 714)">
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

          {/* 6. Live Moving Scroll Cursor Node (Updated directly via RAF ref) */}
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
