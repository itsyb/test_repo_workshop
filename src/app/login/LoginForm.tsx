"use client";

import { AnimatePresence, motion } from "motion/react";
import { useActionState } from "react";
import { requestLogin } from "@/app/actions";
import { LoginHero } from "@/components/LoginHero";
import { EASE } from "@/components/motion";

export function LoginForm({ expired }: { expired: boolean }) {
  const [state, action, pending] = useActionState(requestLogin, null);

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <LoginHero />

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
