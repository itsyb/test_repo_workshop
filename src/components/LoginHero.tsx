"use client";

import { motion } from "motion/react";
import { Gem } from "./Gem";
import { EASE, SplitHeadline } from "./motion";
import type { GemColor } from "@/lib/gems";

const ORBIT: { color: GemColor; x: string; y: string; size: number; delay: number }[] = [
  { color: "BLUE", x: "-150px", y: "-40px", size: 64, delay: 0.2 },
  { color: "PURPLE", x: "0px", y: "-90px", size: 92, delay: 0.3 },
  { color: "GREEN", x: "150px", y: "-30px", size: 70, delay: 0.4 },
  { color: "YELLOW", x: "-80px", y: "50px", size: 46, delay: 0.5 },
  { color: "TRANSPARENT", x: "95px", y: "60px", size: 52, delay: 0.6 },
];

/** Floating gems, program name and tagline shown above the sign-in form. */
export function LoginHero() {
  return (
    <>
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

    </>
  );
}
