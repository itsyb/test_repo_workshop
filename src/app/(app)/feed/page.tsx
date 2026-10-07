import { SplitHeadline } from "@/components/motion";
import { prisma } from "@/lib/db";
import { loadFeed } from "@/lib/feed";
import { FeedList } from "./FeedList";

export default async function FeedPage() {
  const first = await loadFeed(prisma, {});
  return (
    <div>
      <p className="eyebrow mb-3">Newsfeed</p>
      <SplitHeadline text="Thank-yous, in the open." className="display mb-10 text-5xl sm:text-6xl" />
      <FeedList initial={first} />
    </div>
  );
}
