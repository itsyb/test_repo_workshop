import Link from "next/link";
import { GEM_META, type GemColor } from "@/lib/gems";
import type { FeedItem } from "@/lib/feed";
import { Avatar } from "./Avatar";
import { Gem } from "./Gem";
import { TimeAgo } from "./TimeAgo";

export function FeedCard({ item }: { item: FeedItem }) {
  const meta = GEM_META[item.color as GemColor] ?? GEM_META.TRANSPARENT;
  return (
    <article className="card card-hover p-5 sm:p-6">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-25 blur-3xl"
        style={{ background: meta.hex }}
        aria-hidden
      />
      <div className="flex items-start gap-4">
        <div className="relative">
          <Avatar name={item.from?.name ?? item.to.name} src={item.from?.avatarUrl ?? item.to.avatarUrl} size={44} />
          <Gem color={item.color as GemColor} size={22} glow className="absolute -bottom-1.5 -right-2" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-snug text-ink-2">
            {item.kind === "TRANSFER" && item.from ? (
              <>
                <Link href={`/people/${item.from.id}`} className="font-semibold text-ink hover:underline">
                  {item.from.name}
                </Link>{" "}
                tipped{" "}
                <Link href={`/people/${item.to.id}`} className="font-semibold text-ink hover:underline">
                  {item.to.name}
                </Link>{" "}
                with a{" "}
                <span className="font-semibold" style={{ color: meta.hex }}>
                  {meta.name.toLowerCase()}
                </span>{" "}
                gem
              </>
            ) : (
              <>
                <Link href={`/people/${item.to.id}`} className="font-semibold text-ink hover:underline">
                  {item.to.name}
                </Link>{" "}
                won{" "}
                <span className="font-semibold" style={{ color: meta.hex }}>
                  {item.amount} {meta.name.toLowerCase()}
                </span>{" "}
                {item.amount === 1 ? "gem" : "gems"} in a challenge
              </>
            )}
            <span className="text-ink-3"> · </span>
            <TimeAgo iso={item.createdAt} className="text-sm text-ink-3" />
          </p>
          {item.kind === "TRANSFER" ? (
            <blockquote className="mt-2.5 text-[17px] leading-relaxed text-ink">“{item.comment}”</blockquote>
          ) : (
            <p className="mt-2.5 text-[17px] text-ink">🏆 {item.challenge}</p>
          )}
          <div className="mt-3 text-xs font-medium" style={{ color: meta.hex }}>
            {meta.value}
          </div>
        </div>
      </div>
    </article>
  );
}
