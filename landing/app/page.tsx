import { WhatsAppLanding } from "@/components/whatsapp-landing";
import { getCommunityStats } from "@/lib/community-stats";

export default async function HomePage() {
  const stats = await getCommunityStats();

  return <WhatsAppLanding stats={stats} />;
}
