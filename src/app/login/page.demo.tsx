"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { LoginHero } from "@/components/LoginHero";
import { EASE } from "@/components/motion";
import { userById } from "@/demo/engine";
import { PERSONAS } from "@/demo/fixture";
import { useDemo } from "@/demo/store";

export default function DemoLogin() {
  const { state, signIn } = useDemo();
  const router = useRouter();
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <LoginHero />
      <motion.div
        className="mt-12 w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.9, ease: EASE }}
      >
        <p className="eyebrow mb-4 text-center">Demo · choose who you are</p>
        <div className="grid gap-2">
          {PERSONAS.map((p) => {
            const u = userById(state, p.id)!;
            return (
              <button
                key={p.id}
                onClick={() => {
                  signIn(p.id);
                  router.push("/");
                }}
                className="glass flex items-center gap-4 rounded-2xl px-4 py-3 text-left transition-all hover:border-white/25 hover:bg-white/[0.06] active:scale-[0.99]"
              >
                <Avatar name={u.name} size={42} />
                <div className="flex-1">
                  <div className="font-semibold">{u.name}</div>
                  <div className="text-sm text-ink-3">{p.note}</div>
                </div>
                <span className="text-ink-3">→</span>
              </button>
            );
          })}
        </div>
        <p className="mt-6 text-center text-xs leading-relaxed text-ink-3">
          A static preview: fictional people, no server. Everything you do is saved only in this browser.
        </p>
      </motion.div>
    </main>
  );
}
