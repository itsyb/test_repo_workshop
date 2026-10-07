"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "./Avatar";
import { Gem } from "./Gem";
import { EASE } from "./motion";

const LINKS = [
  { href: "/", label: "Home", icon: "M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/feed", label: "Feed", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/challenges", label: "Challenges", icon: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" },
  { href: "/store", label: "Store", icon: "M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2" },
  { href: "/people", label: "People", icon: "M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M20 19v-1a4 4 0 0 0-3-3.87M16 4.13a3 3 0 0 1 0 5.74" },
];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

export function Nav({
  user,
  onLogout,
  extraMenu,
}: {
  user: { id: string; name: string; avatarUrl: string | null; isAdmin: boolean };
  onLogout: () => void | Promise<void>;
  extraMenu?: React.ReactNode;
}) {
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMenu(false), [path]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  return (
    <>
      {/* Desktop / tablet: floating glass bar */}
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: EASE }}
        className="fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-4"
      >
        <nav className="glass flex h-14 w-full max-w-5xl items-center gap-2 rounded-full pl-5 pr-2 shadow-2xl shadow-black/40">
          <Link href="/" className="mr-3 flex items-center gap-2 font-semibold tracking-tight">
            <Gem color="PURPLE" size={22} glint />
            <span className="hidden sm:inline">Gem Quest</span>
          </Link>
          <div className="hidden flex-1 items-center gap-1 md:flex">
            {[...LINKS, ...(user.isAdmin ? [{ href: "/admin", label: "Admin", icon: "" }] : [])].map((l) => {
              const active = isActive(path, l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors ${active ? "text-ink" : "text-ink-2 hover:text-ink"}`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-white/10"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative">{l.label}</span>
                </Link>
              );
            })}
          </div>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <Link href="/give" className="btn btn-primary btn-sm h-10 px-5">
              <Gem color="TRANSPARENT" size={16} />
              Give a gem
            </Link>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenu((m) => !m)}
                className="rounded-full transition-transform active:scale-95"
                aria-label="Account menu"
                aria-expanded={menu}
              >
                <Avatar name={user.name} src={user.avatarUrl} size={40} />
              </button>
              <AnimatePresence>
                {menu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -6, filter: "blur(6px)" }}
                    animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.97, y: -4, filter: "blur(4px)" }}
                    transition={{ duration: 0.25, ease: EASE }}
                    className="glass absolute right-0 top-12 w-56 origin-top-right overflow-hidden rounded-2xl p-1.5 shadow-2xl shadow-black/60"
                  >
                    <div className="px-3 py-2.5 text-sm font-semibold">{user.name}</div>
                    <Link href={`/people/${user.id}`} className="block rounded-xl px-3 py-2 text-sm text-ink-2 hover:bg-white/8 hover:text-ink">
                      My profile & orders
                    </Link>
                    {user.isAdmin && (
                      <Link href="/admin" className="block rounded-xl px-3 py-2 text-sm text-ink-2 hover:bg-white/8 hover:text-ink md:hidden">
                        Admin
                      </Link>
                    )}
                    {extraMenu}
                    <form action={onLogout}>
                      <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-ink-2 hover:bg-white/8 hover:text-ink">
                        Sign out
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </nav>
      </motion.header>

      {/* Phone: bottom tab bar */}
      <nav className="glass fixed inset-x-3 bottom-3 z-40 flex h-16 items-center justify-around rounded-[22px] pb-[env(safe-area-inset-bottom)] md:hidden">
        {LINKS.map((l) => {
          const active = isActive(path, l.href);
          return (
            <Link key={l.href} href={l.href} className="relative flex w-14 flex-col items-center gap-1 py-1.5">
              {active && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-2xl bg-white/10"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <svg
                viewBox="0 0 24 24"
                className={`relative h-5 w-5 ${active ? "text-ink" : "text-ink-3"}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={l.icon} />
              </svg>
              <span className={`relative text-[10px] font-medium ${active ? "text-ink" : "text-ink-3"}`}>{l.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
