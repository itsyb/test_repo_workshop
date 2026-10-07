import { Nav } from "@/components/Nav";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncSprints } from "@/lib/sprint";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // Opens/closes sprints lazily — the calendar is enforced on every visit.
  await syncSprints(prisma);
  return (
    <>
      <Nav user={{ id: user.id, name: user.name, avatarUrl: user.avatarUrl, isAdmin: user.isAdmin }} />
      <main className="mx-auto w-full max-w-5xl px-4 pb-32 pt-28 sm:px-6 md:pb-24">{children}</main>
    </>
  );
}
