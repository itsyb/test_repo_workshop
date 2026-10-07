"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { ActionResult } from "@/lib/errors";
import { Gem } from "@/components/Gem";
import { EASE, Spotlight } from "@/components/motion";
import { Portal } from "@/components/Portal";
import { GEM_META, PRODUCT_CATEGORIES, WALLET_COLORS, emptyBalance, total, type Balance } from "@/lib/gems";
import { autoSpend } from "@/lib/store-spend";

type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  emoji: string | null;
  imageUrl: string | null;
  stock: number | null;
};

type Buy = (productId: string, spend: Partial<Balance>) => Promise<ActionResult>;

export function StoreGrid({ products, balance, buy }: { products: Product[]; balance: Balance; buy: Buy }) {
  const [cat, setCat] = useState<string | null>(null);
  const [open, setOpen] = useState<Product | null>(null);
  const have = total(balance);
  const cats = Object.keys(PRODUCT_CATEGORIES).filter((c) => products.some((p) => p.category === c));
  const shown = cat ? products.filter((p) => p.category === cat) : products;

  return (
    <>
      <div className="glass sticky top-24 z-30 mb-8 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl px-5 py-3.5">
        <span className="text-sm text-ink-2">Your gems</span>
        {WALLET_COLORS.map((c) => (
          <span key={c} className="inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums">
            <Gem color={c} size={16} /> {balance[c]}
          </span>
        ))}
        <span className="ml-auto text-sm font-semibold">
          <span className="text-prism">{have}</span> total
        </span>
      </div>

      <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4">
        <button className="chip" data-active={!cat} onClick={() => setCat(null)}>
          All
        </button>
        {cats.map((c) => (
          <button key={c} className="chip shrink-0" data-active={cat === c} onClick={() => setCat(c)}>
            {PRODUCT_CATEGORIES[c]!.label}
          </button>
        ))}
      </div>

      <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {shown.map((p, i) => {
            const tint = PRODUCT_CATEGORIES[p.category]?.tint ?? "#a1a1a6";
            const soldOut = p.stock !== null && p.stock <= 0;
            const affordable = have >= p.price && !soldOut;
            return (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.6, ease: EASE, delay: Math.min(i, 9) * 0.05 }}
              >
                <Spotlight tilt className="flex h-full flex-col">
                  <div
                    className="relative flex h-44 items-center justify-center overflow-hidden"
                    style={{ background: `radial-gradient(120% 90% at 50% 0%, ${tint}38, transparent 70%)` }}
                  >
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" className="h-full w-full object-cover opacity-90" />
                    ) : (
                      <span className="text-7xl drop-shadow-2xl transition-transform duration-700 group-hover:scale-110">{p.emoji ?? "🎁"}</span>
                    )}
                    <span className="glass absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-medium">
                      {PRODUCT_CATEGORIES[p.category]?.label ?? p.category}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="text-lg font-semibold leading-snug">{p.name}</h3>
                    <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-2">{p.description}</p>
                    <div className="mt-5 flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-lg font-semibold tabular-nums">
                        <span className="flex -space-x-1.5">
                          <Gem color="BLUE" size={16} />
                          <Gem color="PURPLE" size={16} />
                          <Gem color="GREEN" size={16} />
                        </span>
                        {p.price}
                      </span>
                      <button className="btn btn-primary btn-sm" disabled={!affordable} onClick={() => setOpen(p)}>
                        {soldOut ? "Sold out" : affordable ? "Redeem" : `${p.price - have} more`}
                      </button>
                    </div>
                    {p.stock !== null && !soldOut && <p className="mt-2 text-xs text-ink-3">{p.stock} left</p>}
                  </div>
                </Spotlight>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
      {products.length === 0 && <div className="card p-12 text-center text-ink-2">The store opens soon.</div>}

      <Portal>
        <AnimatePresence>{open && <Checkout product={open} balance={balance} buy={buy} onClose={() => setOpen(null)} />}</AnimatePresence>
      </Portal>
    </>
  );
}

function Checkout({ product, balance, buy, onClose }: { product: Product; balance: Balance; buy: Buy; onClose: () => void }) {
  const router = useRouter();
  const [spend, setSpend] = useState<Balance>(() => autoSpend(balance, product.price) ?? emptyBalance());
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const picked = total(spend);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const bump = (c: keyof Balance, d: number) =>
    setSpend((s) => {
      const v = s[c] + d;
      if (v < 0 || v > balance[c] || (d > 0 && total(s) >= product.price)) return s;
      return { ...s, [c]: v };
    });

  const confirm = () =>
    start(async () => {
      const res = await buy(product.id, spend);
      if (!res.ok) return setError(res.error);
      setDone(res.message ?? "Done");
      router.refresh();
    });

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xl sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Redeem ${product.name}`}
        onClick={(e) => e.stopPropagation()}
        className="card m-3 w-full max-w-md bg-[#0d0d10] p-7"
        initial={{ y: 60, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-6 text-center">
              <motion.div
                className="text-7xl"
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 14 }}
              >
                {product.emoji ?? "🎁"}
              </motion.div>
              <h3 className="display mt-6 text-3xl">It’s yours.</h3>
              <p className="mt-2 text-ink-2">{done}</p>
              <button onClick={onClose} className="btn btn-primary mt-8 w-full">
                Done
              </button>
            </motion.div>
          ) : (
            <motion.div key="pick" exit={{ opacity: 0 }}>
              <div className="flex items-center gap-4">
                <span className="text-5xl">{product.emoji ?? "🎁"}</span>
                <div>
                  <h3 className="text-xl font-semibold">{product.name}</h3>
                  <p className="text-ink-2">{product.price} gems · any colour</p>
                </div>
              </div>
              <p className="mt-6 text-sm text-ink-2">Choose which gems to spend:</p>
              <div className="mt-3 space-y-2">
                {WALLET_COLORS.map((c) => (
                  <div key={c} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-2.5">
                    <Gem color={c} size={22} dim={balance[c] === 0} />
                    <div className="flex-1 text-sm">
                      <span style={{ color: GEM_META[c].hex }}>{GEM_META[c].value}</span>
                      <span className="text-ink-3"> · {balance[c]} available</span>
                    </div>
                    <button className="btn btn-ghost btn-sm w-9 px-0" onClick={() => bump(c, -1)} aria-label={`Fewer ${GEM_META[c].name}`}>
                      −
                    </button>
                    <span className="w-6 text-center font-semibold tabular-nums">{spend[c]}</span>
                    <button className="btn btn-ghost btn-sm w-9 px-0" onClick={() => bump(c, 1)} aria-label={`More ${GEM_META[c].name}`}>
                      +
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className={picked === product.price ? "text-ink-2" : "text-amber-300/90"}>
                  {picked} of {product.price} selected
                </span>
                <button className="text-ink-2 hover:text-ink" onClick={() => setSpend(autoSpend(balance, product.price) ?? emptyBalance())}>
                  Auto-pick
                </button>
              </div>
              {error && <p className="mt-4 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p>}
              <div className="mt-6 flex gap-3">
                <button onClick={onClose} className="btn btn-ghost flex-1">
                  Cancel
                </button>
                <button onClick={confirm} className="btn btn-primary flex-1" disabled={pending || picked !== product.price}>
                  {pending ? "Redeeming…" : "Confirm"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
