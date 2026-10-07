import { useId } from "react";
import { GEM_META, type GemColor } from "@/lib/gems";

// Facets of a brilliant-cut stone, side view (viewBox 0 0 100 100).
// Each facet carries its own white overlay so light appears to come from the top left.
const CROWN: [string, number][] = [
  ["10,40 28,22 30,40", 0.18],
  ["28,22 50,22 30,40", 0.42],
  ["30,40 50,22 50,40", 0.26],
  ["50,40 50,22 70,40", 0.1],
  ["50,22 72,22 70,40", 0.2],
  ["70,40 72,22 90,40", 0.04],
];
const PAVILION: [string, number][] = [
  ["10,40 30,40 50,90", 0.12],
  ["30,40 50,40 50,90", 0.3],
  ["50,40 70,40 50,90", 0.02],
  ["70,40 90,40 50,90", -0.18],
];

export function Gem({
  color,
  size = 28,
  glow = false,
  glint = false,
  dim = false,
  className = "",
}: {
  color: GemColor;
  size?: number;
  glow?: boolean;
  glint?: boolean;
  dim?: boolean;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const meta = GEM_META[color];
  const clear = color === "TRANSPARENT";
  return (
    <span
      className={`relative inline-block shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        filter: dim
          ? "grayscale(1) brightness(0.45)"
          : glow
            ? `drop-shadow(0 0 ${size * 0.22}px ${meta.hex}aa) drop-shadow(0 ${size * 0.08}px ${size * 0.16}px ${meta.hex2}88)`
            : undefined,
        transition: "filter .5s cubic-bezier(.22,1,.36,1)",
      }}
      aria-label={`${meta.name} gem`}
      role="img"
    >
      <svg viewBox="0 0 100 100" width={size} height={size} className="overflow-visible">
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0" stopColor={meta.hex} />
            <stop offset="1" stopColor={meta.hex2} />
          </linearGradient>
          <clipPath id={`c${id}`}>
            <polygon points="10,40 28,22 72,22 90,40 50,90" />
          </clipPath>
        </defs>
        <polygon points="10,40 28,22 72,22 90,40 50,90" fill={`url(#g${id})`} opacity={clear ? 0.55 : 1} />
        {[...CROWN, ...PAVILION].map(([points, light]) => (
          <polygon
            key={points}
            points={points}
            fill={light >= 0 ? "#fff" : "#000"}
            opacity={Math.abs(light) * (clear ? 1.2 : 1)}
            stroke="#fff"
            strokeOpacity={clear ? 0.55 : 0.28}
            strokeWidth={0.8}
            strokeLinejoin="round"
          />
        ))}
        <polyline points="10,40 90,40" stroke="#fff" strokeOpacity={0.5} strokeWidth={1} />
        {glint && (
          <g clipPath={`url(#c${id})`}>
            <rect
              x="0"
              y="0"
              width="22"
              height="100"
              fill="#fff"
              opacity="0.55"
              style={{ animation: "gem-glint 4.5s cubic-bezier(.22,1,.36,1) infinite", transformBox: "view-box" }}
            />
          </g>
        )}
      </svg>
    </span>
  );
}
