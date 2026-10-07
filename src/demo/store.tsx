"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { RuleError, type ActionResult } from "@/lib/errors";
import { DEMO_VERSION, createDemoState, userById, type DemoState } from "./engine";

const KEY = "gem-quest-demo";

function load(): DemoState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as DemoState;
      // Start over when the format changed or the demo sprint has finished.
      if (s.v === DEMO_VERSION && new Date().toISOString() < s.sprint.endsAt) return s;
    }
  } catch {
    // Storage unavailable or corrupted — fall through to a fresh demo.
  }
  return createDemoState();
}

function save(s: DemoState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Private mode / quota — the demo still works for this tab.
  }
}

type Ctx = {
  state: DemoState;
  me: DemoState["users"][number] | null;
  /** Applies an operation to a copy of the state; rule violations become `{ ok: false }`. */
  run: (op: (draft: DemoState) => string | void) => Promise<ActionResult>;
  signIn: (userId: string) => void;
  signOut: () => void;
  reset: () => void;
};

const DemoContext = createContext<Ctx | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState | null>(null);

  useEffect(() => setState(load()), []);

  const commit = useCallback((next: DemoState) => {
    save(next);
    setState(next);
  }, []);

  const value = useMemo<Ctx | null>(() => {
    if (!state) return null;
    return {
      state,
      me: state.meId ? userById(state, state.meId) : null,
      run: async (op) => {
        const draft = structuredClone(state);
        try {
          const message = op(draft);
          commit(draft);
          return { ok: true, message: message || undefined };
        } catch (e) {
          if (e instanceof RuleError) return { ok: false, error: e.message };
          console.error(e);
          return { ok: false, error: "Something went wrong in the demo." };
        }
      },
      signIn: (userId) => commit({ ...state, meId: userId }),
      signOut: () => commit({ ...state, meId: null }),
      reset: () => commit({ ...createDemoState(), meId: state.meId }),
    };
  }, [state, commit]);

  // Static HTML has no browser state; render once it is loaded.
  if (!value) return null;
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used inside <DemoProvider>");
  return ctx;
}

/** Same as useDemo, but for pages that need a signed-in persona. */
export function useDemoUser() {
  const ctx = useDemo();
  if (!ctx.me) throw new Error("No demo persona selected");
  return { ...ctx, me: ctx.me };
}
