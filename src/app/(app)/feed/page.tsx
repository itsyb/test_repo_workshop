import { feedPage } from "@/app/actions";
import { prisma } from "@/lib/db";
import { loadFeed } from "@/lib/feed";
import { FeedView } from "@/views/SimpleViews";

export default async function FeedPage() {
  return <FeedView initial={await loadFeed(prisma, {})} load={feedPage} />;
}
