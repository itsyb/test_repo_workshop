export const WALLET_COLORS = ["BLUE", "PURPLE", "GREEN", "YELLOW"] as const;
export const DNA_COLORS = ["BLUE", "PURPLE", "GREEN"] as const;
export const BANK_COLORS = ["TRANSPARENT", "YELLOW", "BLUE", "PURPLE", "GREEN"] as const;

export type WalletColor = (typeof WALLET_COLORS)[number];
export type DnaColor = (typeof DNA_COLORS)[number];
export type GemColor = WalletColor | "TRANSPARENT";
export type GemSource = "TRANSPARENT" | "YELLOW";

export const TRANSPARENT_PER_SPRINT = 2;
export const COMMENT_MIN = 20;
export const COMMENT_MAX = 500;
/** Roles that hand out Yellow gems — one per direct report. */
export const YELLOW_GIVER_ROLES = ["LEAD", "MANAGER"];

export const GEM_META: Record<
  GemColor,
  { name: string; value: string; blurb: string; hex: string; hex2: string }
> = {
  BLUE: {
    name: "Blue",
    value: "We Care",
    blurb: "Support, empathy, onboarding help, or assistance during challenging situations.",
    hex: "#2E8BFF",
    hex2: "#0A3FD8",
  },
  PURPLE: {
    name: "Purple",
    value: "Better Together",
    blurb: "Cross-functional collaboration, rapid feedback, or solving blockers together.",
    hex: "#C36BFF",
    hex2: "#6A1FD1",
  },
  GREEN: {
    name: "Green",
    value: "Game Changer",
    blurb: "Proactivity, process optimization, or bold ideas that drive change.",
    hex: "#3BE07A",
    hex2: "#0B8F45",
  },
  YELLOW: {
    name: "Yellow",
    value: "Sprint Excellence",
    blurb: "From your lead, for delivering the committed sprint scope.",
    hex: "#FFD84D",
    hex2: "#E08A00",
  },
  TRANSPARENT: {
    name: "Transparent",
    value: "DNA Chameleon",
    blurb: "Becomes Blue, Purple or Green the moment you give it.",
    hex: "#F2F4F8",
    hex2: "#8E96A6",
  },
};

export function isWalletColor(c: string): c is WalletColor {
  return (WALLET_COLORS as readonly string[]).includes(c);
}
export function isDnaColor(c: string): c is DnaColor {
  return (DNA_COLORS as readonly string[]).includes(c);
}
export function isBankColor(c: string): c is (typeof BANK_COLORS)[number] {
  return (BANK_COLORS as readonly string[]).includes(c);
}

export type Balance = Record<WalletColor, number>;
export const emptyBalance = (): Balance => ({ BLUE: 0, PURPLE: 0, GREEN: 0, YELLOW: 0 });
export const total = (b: Partial<Record<string, number>>) =>
  Object.values(b).reduce<number>((s, n) => s + (n ?? 0), 0);

export const PRODUCT_CATEGORIES: Record<string, { label: string; tint: string }> = {
  EXPERIENCE: { label: "Experience", tint: "#2e8bff" },
  IMPACT: { label: "Impact", tint: "#3be07a" },
  MERCH: { label: "Branded merch", tint: "#c36bff" },
  TIME: { label: "Time", tint: "#ffd84d" },
  OTHER: { label: "Treats", tint: "#ff6b8b" },
};
