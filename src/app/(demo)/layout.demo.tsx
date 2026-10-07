"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Nav } from "@/components/Nav";
import { useDemo } from "@/demo/store";

export default function DemoAppLayout({ children }: { children: React.ReactNode }) {
  const { me, signOut, reset } = useDemo();
  const router = useRouter();

  useEffect(() => {
    if (!me) router.replace("/login");
  }, [me, router]);
  if (!me) return null;

  return (
    <>
      <Nav
        user={{ id: me.id, name: me.name, avatarUrl: me.avatarUrl, isAdmin: me.isAdmin }}
        onLogout={() => {
          signOut();
          router.replace("/login");
        }}
        extraMenu={
          <button
            onClick={() => {
              if (confirm("Start the demo over with fresh data?")) reset();
            }}
            className="w-full rounded-xl px-3 py-2 text-left text-sm text-ink-2 hover:bg-white/8 hover:text-ink"
          >
            Reset demo data
          </button>
        }
      />
      <main className="mx-auto w-full max-w-5xl px-4 pb-32 pt-28 sm:px-6 md:pb-24">{children}</main>
      <div className="glass pointer-events-none fixed bottom-24 right-4 z-30 rounded-full px-3 py-1.5 text-[11px] font-medium text-ink-2 md:bottom-4">
        Demo · data stays in your browser
      </div>
    </>
  );
}
