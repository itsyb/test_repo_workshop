"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/errors";
import { Gem } from "@/components/Gem";
import { BANK_COLORS, DNA_COLORS, GEM_META, PRODUCT_CATEGORIES, type GemColor } from "@/lib/gems";

type R = Promise<ActionResult>;
/** Admin operations; the server app passes server actions, the static demo local ones. */
export type AdminActions = {
  order: (orderId: string, status: "FULFILLED" | "REJECTED", note?: string) => R;
  challengeStatus: (id: string, status: "DRAFT" | "ACTIVE" | "CLOSED") => R;
  createChallenge: (input: { title: string; description: string; emoji: string }) => R;
  award: (entryId: string, bankColor: string, amount: number, convertTo?: string) => R;
  saveProduct: (input: ProductInput) => R;
};

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<ActionResult>, after?: () => void) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) return setError(res.error);
      after?.();
      router.refresh();
    });
  return { pending, error, run };
}

const Err = ({ error }: { error: string | null }) => (error ? <p className="text-sm text-rose-300">{error}</p> : null);

export function OrderActions({ id, act }: { id: string; act: AdminActions["order"] }) {
  const { pending, error, run } = useAction();
  const [note, setNote] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="field h-9 w-44 rounded-full py-0 text-sm" />
      <button className="btn btn-primary btn-sm" disabled={pending} onClick={() => run(() => act(id, "FULFILLED", note))}>
        Mark delivered
      </button>
      <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => run(() => act(id, "REJECTED", note))}>
        Reject & refund
      </button>
      <Err error={error} />
    </div>
  );
}

export function NewChallenge({ create }: { create: AdminActions["createChallenge"] }) {
  const { pending, error, run } = useAction();
  const [f, setF] = useState({ title: "", description: "", emoji: "" });
  return (
    <div className="card space-y-3 p-6">
      <h3 className="font-semibold">New challenge</h3>
      <div className="flex gap-3">
        <input value={f.emoji} onChange={(e) => setF({ ...f, emoji: e.target.value })} placeholder="🏆" className="field w-20 text-center" aria-label="Emoji" />
        <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Title" className="field" aria-label="Title" />
      </div>
      <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="What counts as a winning entry?" rows={2} className="field resize-none" aria-label="Description" />
      <Err error={error} />
      <button className="btn btn-primary btn-sm" disabled={pending} onClick={() => run(() => create(f), () => setF({ title: "", description: "", emoji: "" }))}>
        Create as draft
      </button>
    </div>
  );
}

type Entry = { id: string; name: string; text: string; link: string | null; prizeAmount: number | null; prizeColor: GemColor | null };

export function ChallengeAdmin({
  challenge,
  entries,
  bank,
  setStatus,
  award,
}: {
  challenge: { id: string; title: string; description: string; emoji: string | null; status: string };
  entries: Entry[];
  bank: Record<string, number>;
  setStatus: AdminActions["challengeStatus"];
  award: AdminActions["award"];
}) {
  const { pending, error, run } = useAction();
  const badge = { ACTIVE: "bg-emerald-400/15 text-emerald-300", DRAFT: "bg-white/10 text-ink-2", CLOSED: "bg-white/5 text-ink-3" }[challenge.status];
  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-start gap-4">
        <span className="text-3xl">{challenge.emoji ?? "✨"}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{challenge.title}</h3>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge}`}>{challenge.status}</span>
          </div>
          <p className="mt-1 text-sm text-ink-2">{challenge.description}</p>
        </div>
        <div className="flex gap-2">
          {challenge.status !== "ACTIVE" && (
            <button className="btn btn-primary btn-sm" disabled={pending} onClick={() => run(() => setStatus(challenge.id, "ACTIVE"))}>
              Activate
            </button>
          )}
          {challenge.status === "ACTIVE" && (
            <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => run(() => setStatus(challenge.id, "CLOSED"))}>
              Close
            </button>
          )}
          {challenge.status === "CLOSED" && (
            <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => run(() => setStatus(challenge.id, "DRAFT"))}>
              Back to draft
            </button>
          )}
        </div>
      </div>
      <Err error={error} />
      {entries.length > 0 && (
        <div className="mt-5 space-y-3 border-t border-white/5 pt-5">
          {entries.map((e) => (
            <div key={e.id} className="flex flex-wrap items-start gap-3 rounded-2xl bg-white/[0.03] p-4">
              <div className="min-w-0 flex-1 text-sm">
                <div className="font-semibold">{e.name}</div>
                <p className="text-ink-2">{e.text}</p>
                {e.link && (
                  <a href={e.link} target="_blank" rel="noreferrer" className="text-xs text-[#2e8bff] hover:underline">
                    {e.link}
                  </a>
                )}
              </div>
              {e.prizeAmount ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-300">
                  🏆 +{e.prizeAmount} <Gem color={e.prizeColor ?? "TRANSPARENT"} size={14} />
                </span>
              ) : (
                <AwardForm entryId={e.id} bank={bank} award={award} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AwardForm({ entryId, bank, award }: { entryId: string; bank: Record<string, number>; award: AdminActions["award"] }) {
  const { pending, error, run } = useAction();
  const [from, setFrom] = useState<string>(BANK_COLORS.find((c) => bank[c] > 0) ?? "TRANSPARENT");
  const [to, setTo] = useState<string>("PURPLE");
  const [amount, setAmount] = useState(3);
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="field h-9 w-16 rounded-full px-3 py-0 text-center" aria-label="Amount" />
        <select value={from} onChange={(e) => setFrom(e.target.value)} className="field h-9 w-auto rounded-full py-0" aria-label="From bank colour">
          {BANK_COLORS.map((c) => (
            <option key={c} value={c}>
              {GEM_META[c].name} ({bank[c]})
            </option>
          ))}
        </select>
        {from === "TRANSPARENT" && (
          <select value={to} onChange={(e) => setTo(e.target.value)} className="field h-9 w-auto rounded-full py-0" aria-label="Convert to">
            {DNA_COLORS.map((c) => (
              <option key={c} value={c}>
                → {GEM_META[c].name}
              </option>
            ))}
          </select>
        )}
        <button className="btn btn-primary btn-sm" disabled={pending} onClick={() => run(() => award(entryId, from, amount, from === "TRANSPARENT" ? to : undefined))}>
          Award
        </button>
      </div>
      <Err error={error} />
    </div>
  );
}

export type ProductInput = {
  id?: string;
  name: string;
  description: string;
  category: string;
  price: number;
  emoji: string;
  stock: number | null;
  active: boolean;
};

export function ProductEditor({ product, save }: { product?: ProductInput; save: AdminActions["saveProduct"] }) {
  const { pending, error, run } = useAction();
  const blank: ProductInput = { name: "", description: "", category: "MERCH", price: 5, emoji: "🎁", stock: null, active: true };
  const [p, setP] = useState<ProductInput>(product ?? blank);
  const [open, setOpen] = useState(false);

  if (!open) {
    return product ? (
      <button onClick={() => setOpen(true)} className={`card card-hover flex w-full items-center gap-4 p-5 text-left ${product.active ? "" : "opacity-50"}`}>
        <span className="text-3xl">{product.emoji || "🎁"}</span>
        <div className="min-w-0 flex-1">
          <div className="font-medium">{product.name}</div>
          <div className="text-sm text-ink-3">
            {PRODUCT_CATEGORIES[product.category]?.label} · {product.price} gems · {product.stock === null ? "unlimited" : `${product.stock} in stock`}
            {!product.active && " · hidden"}
          </div>
        </div>
        <span className="text-sm text-ink-2">Edit</span>
      </button>
    ) : (
      <button onClick={() => setOpen(true)} className="btn btn-primary">
        + Add reward
      </button>
    );
  }

  return (
    <div className="card space-y-3 p-6">
      <div className="flex gap-3">
        <input value={p.emoji} onChange={(e) => setP({ ...p, emoji: e.target.value })} className="field w-20 text-center" aria-label="Emoji" />
        <input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} placeholder="Name" className="field" aria-label="Name" />
      </div>
      <textarea value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} rows={2} placeholder="Description" className="field resize-none" aria-label="Description" />
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm text-ink-2">
          Category
          <select value={p.category} onChange={(e) => setP({ ...p, category: e.target.value })} className="field mt-1">
            {Object.entries(PRODUCT_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-ink-2">
          Price (gems)
          <input type="number" min={1} value={p.price} onChange={(e) => setP({ ...p, price: Number(e.target.value) })} className="field mt-1" />
        </label>
        <label className="text-sm text-ink-2">
          Stock (empty = unlimited)
          <input
            type="number"
            min={0}
            value={p.stock ?? ""}
            onChange={(e) => setP({ ...p, stock: e.target.value === "" ? null : Number(e.target.value) })}
            className="field mt-1"
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-2">
        <input type="checkbox" checked={p.active} onChange={(e) => setP({ ...p, active: e.target.checked })} /> Visible in the store
      </label>
      <Err error={error} />
      <div className="flex gap-2">
        <button
          className="btn btn-primary btn-sm"
          disabled={pending}
          onClick={() =>
            run(
              () => save(p),
              () => {
                setOpen(false);
                if (!product) setP(blank);
              },
            )
          }
        >
          Save
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
