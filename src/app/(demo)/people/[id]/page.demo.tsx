import { DEMO_USERS } from "@/demo/fixture";
import { DemoProfile } from "./DemoProfile";

export function generateStaticParams() {
  return DEMO_USERS.map((u) => ({ id: u.id }));
}

export default async function DemoProfilePage({ params }: { params: Promise<{ id: string }> }) {
  return <DemoProfile id={(await params).id} />;
}
