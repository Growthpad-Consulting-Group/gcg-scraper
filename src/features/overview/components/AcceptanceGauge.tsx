"use client";

import type { AcceptanceStats } from "@/features/overview/lib/dashboardStats";

interface Props {
  stats: AcceptanceStats;
  loading?: boolean;
}

// Describes a point on the arc at `angle` radians from the center (cx, cy) with radius r
function polar(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

// SVG arc path between two angles (in radians), clockwise
function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polar(cx, cy, r, startAngle);
  const end   = polar(cx, cy, r, endAngle);
  const span  = endAngle - startAngle;
  const large = span > Math.PI ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

// Semicircle: start = 180° (left), end = 0° (right), sweep CCW
const START = Math.PI;     // 180°
const END   = 2 * Math.PI; // 360° = 0° i.e. right side

function rateColor(rate: number): string {
  if (rate >= 75) return "#22c55e";
  if (rate >= 50) return "#eab308";
  return "#ef4444";
}

function rateGlow(rate: number): string {
  if (rate >= 75) return "rgba(34,197,94,0.25)";
  if (rate >= 50) return "rgba(234,179,8,0.25)";
  return "rgba(239,68,68,0.25)";
}

function rateLabel(rate: number): string {
  if (rate >= 75) return "Healthy";
  if (rate >= 50) return "Fair";
  return "Low";
}

export default function AcceptanceGauge({ stats, loading }: Props) {
  const { rate, totalAccepted, totalRejected, totalExtracted } = stats;
  const displayRate = rate ?? 0;
  const color = rateColor(displayRate);
  const glow  = rateGlow(displayRate);

  // SVG dimensions
  const W = 200, H = 120;
  const cx = W / 2, cy = H - 8;
  const r  = 80, sw = 14; // radius, stroke width

  // Fill angle: maps 0–100% to a sweep from START → END
  const fillEnd = START + (displayRate / 100) * Math.PI;

  // Ticks at 0%, 25%, 50%, 75%, 100%
  const ticks = [0, 25, 50, 75, 100];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <defs>
            {/* Glow filter */}
            <filter id="gauge-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Gradient along the arc (simulated via linear gradient) */}
            <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity="0.7" />
              <stop offset="100%" stopColor={color} stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Track arc */}
          <path
            d={arcPath(cx, cy, r, START, END)}
            fill="none"
            stroke="currentColor"
            strokeWidth={sw}
            strokeLinecap="round"
            className="text-surface-2"
          />

          {/* Tick marks */}
          {ticks.map((pct) => {
            const angle = START + (pct / 100) * Math.PI;
            const inner = polar(cx, cy, r - sw / 2 - 2, angle);
            const outer = polar(cx, cy, r + sw / 2 + 2, angle);
            return (
              <line
                key={pct}
                x1={inner.x.toFixed(1)} y1={inner.y.toFixed(1)}
                x2={outer.x.toFixed(1)} y2={outer.y.toFixed(1)}
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-canvas"
              />
            );
          })}

          {/* Fill arc (glow + solid) */}
          {rate !== null && displayRate > 0 && (
            <>
              {/* Shadow/glow layer */}
              <path
                d={arcPath(cx, cy, r, START, fillEnd)}
                fill="none"
                stroke={glow}
                strokeWidth={sw + 8}
                strokeLinecap="round"
                filter="url(#gauge-glow)"
              />
              {/* Main fill */}
              <path
                d={arcPath(cx, cy, r, START, fillEnd)}
                fill="none"
                stroke={color}
                strokeWidth={sw}
                strokeLinecap="round"
              />
              {/* End cap highlight */}
              {displayRate > 2 && (() => {
                const pt = polar(cx, cy, r, fillEnd);
                return (
                  <circle
                    cx={pt.x.toFixed(2)}
                    cy={pt.y.toFixed(2)}
                    r={sw / 2 + 2}
                    fill={color}
                    opacity="0.4"
                  />
                );
              })()}
            </>
          )}
        </svg>

        {/* Center content (absolutely positioned over the arc's open bottom half) */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-1">
          {loading ? (
            <div className="h-9 w-16 animate-pulse rounded-lg bg-surface-2" />
          ) : rate === null ? (
            <span className="font-mono text-2xl font-bold text-text-lo">—</span>
          ) : (
            <>
              <span
                className="font-mono text-4xl font-bold leading-none"
                style={{ color, textShadow: `0 0 20px ${glow}` }}
              >
                {rate}%
              </span>
              <span className="mt-0.5 font-mono text-[11px] font-semibold" style={{ color }}>
                {rateLabel(rate)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Sub stats row */}
      <div className="grid w-full grid-cols-2 gap-2">
        <div className="flex flex-col items-center rounded-2xl border border-status-success/20 bg-status-success/8 py-3">
          <span className="font-mono text-lg font-bold text-status-success">
            {totalAccepted.toLocaleString()}
          </span>
          <span className="mt-0.5 text-[10px] font-semibold text-text-lo">Accepted</span>
        </div>
        <div className="flex flex-col items-center rounded-2xl border border-status-warning/20 bg-status-warning/8 py-3">
          <span className="font-mono text-lg font-bold text-status-warning">
            {totalRejected.toLocaleString()}
          </span>
          <span className="mt-0.5 text-[10px] font-semibold text-text-lo">Rejected</span>
        </div>
      </div>

      {totalExtracted > 0 && (
        <p className="font-mono text-[10px] text-text-lo/50">
          {totalExtracted.toLocaleString()} candidates processed
        </p>
      )}
    </div>
  );
}
