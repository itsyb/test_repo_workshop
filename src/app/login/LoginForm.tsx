"use client";

import { AnimatePresence, motion } from "motion/react";
import { useActionState } from "react";
import { requestLogin } from "@/app/actions";
import { Gem } from "@/components/Gem";
import { EASE, SplitHeadline } from "@/components/motion";
import type { GemColor } from "@/lib/gems";

const ORBIT: { color: GemColor; x: string; y: string; size: number; delay: number }[] = [
  { color: "BLUE", x: "-150px", y: "-40px", size: 64, delay: 0.2 },
  { color: "PURPLE", x: "0px", y: "-90px", size: 92, delay: 0.3 },
  { color: "GREEN", x: "150px", y: "-30px", size: 70, delay: 0.4 },
  { color: "YELLOW", x: "-80px", y: "50px", size: 46, delay: 0.5 },
  { color: "TRANSPARENT", x: "95px", y: "60px", size: 52, delay: 0.6 },
];

export function LoginForm({ expired }: { expired: boolean }) {
  const [state, action, pending] = useActionState(requestLogin, null);

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <div className="relative mb-6 h-56 w-full max-w-md" aria-hidden>
        {ORBIT.map((g, i) => (
          <motion.div
            key={g.color}
            className="absolute left-1/2 top-1/2"
            initial={{ opacity: 0, scale: 0.3, x: "-50%", y: "-50%", rotate: -30 }}
            animate={{ opacity: 1, scale: 1, x: `calc(-50% + ${g.x})`, y: `calc(-50% + ${g.y})`, rotate: 0 }}
            transition={{ duration: 1.2, delay: g.delay, ease: EASE }}
          >
            <div className="animate-float" style={{ animationDelay: `${i * -1.3}s` }}>
              <Gem color={g.color} size={g.size} glow glint />
            </div>
          </motion.div>
        ))}
      </div>

      <motion.p
        className="eyebrow mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 1 }}
      >
        PMI DNA · Internal Motivation Program
      </motion.p>
      <SplitHeadline text="The Gem Quest" className="display text-shine text-center text-6xl sm:text-8xl" />
      <motion.p
        className="mt-5 max-w-md text-center text-lg text-ink-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.9, ease: EASE }}
      >
        Transforming company values into daily actions. Say thank you — more often.
      </motion.p>

      <motion.div
        className="mt-12 w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.9, ease: EASE }}
      >
        <AnimatePresence mode="wait">
          {state?.sent ? (
            <motion.div
              key="sent"
              initial={{ opacity: 0, scale: 0.96, filter: "blur(6px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.6, ease: EASE }}
              className="glass rounded-3xl p-6 text-center"
            >
              <div className="text-xl font-semibold">Check your inbox</div>
              <p className="mt-2 text-sm text-ink-2">
                If that address is part of the program, a sign-in link is on its way. It works once and expires in 15
                minutes.
              </p>
              {state.devLink && (
                <a href={state.devLink} className="btn btn-primary mt-5 w-full">
                  Open sign-in link (demo mode)
                </a>
              )}
            </motion.div>
          ) : (
            <motion.form key="form" action={action} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-3">
              {expired && (
                <p className="text-center text-sm text-amber-300/90">That link has expired or was already used.</p>
              )}
              <label htmlFor="email" className="sr-only">
                Work email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@pmi.com"
                className="field h-14 text-center text-base"
              />
              {state?.error && <p className="text-center text-sm text-rose-400">{state.error}</p>}
              <button className="btn btn-primary h-14 text-base" disabled={pending}>
                {pending ? "Sending…" : "Continue with email"}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}
