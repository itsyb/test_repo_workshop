"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitEntryAction } from "@/app/actions";
import { EASE } from "@/components/motion";

export function EntryForm({ challengeId, initialText, initialLink }: { challengeId: string; initialText: string; initialLink: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(initialText);
  const [link, setLink] = useState(initialLink);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      const res = await submitEntryAction(challengeId, text, link);
      setMsg(res.ok ? { ok: true, text: res.message ?? "Saved" } : { ok: false, text: res.error });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    });

  return (
    <div className="mt-6">
      {!open && (
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          {initialText ? "Edit my entry" : "Take part"}
        </button>
      )}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pt-1">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder="What did you do? Make it easy for the jury to understand."
                className="field resize-none"
                aria-label="Entry description"
              />
              <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link (optional) — Confluence, Figma, SharePoint…" className="field" aria-label="Link" />
              <div className="flex gap-2">
                <button className="btn btn-primary" disabled={pending || text.trim().length < 20} onClick={submit}>
                  {pending ? "Saving…" : "Submit entry"}
                </button>
                <button className="btn btn-ghost" onClick={() => setOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>{msg.text}</p>}
    </div>
  );
}
