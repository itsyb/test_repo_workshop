const PALETTES = [
  ["#2e8bff", "#0a3fd8"],
  ["#c36bff", "#6a1fd1"],
  ["#3be07a", "#0b8f45"],
  ["#ffb340", "#e05a00"],
  ["#ff6b8b", "#b0124a"],
  ["#5ee7f0", "#0b7f9a"],
  ["#a1a1a6", "#3a3a3c"],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function Avatar({
  name,
  src,
  size = 40,
  className = "",
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const [a, b] = PALETTES[hash(name) % PALETTES.length]!;
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white ring-1 ring-white/10 ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(140deg, ${a}, ${b})`,
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span style={{ textShadow: "0 1px 2px rgb(0 0 0 / .25)" }}>{initials(name)}</span>
      )}
    </span>
  );
}
