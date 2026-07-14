import { redirect } from "next/navigation";

import { LandingPage } from "@/components/landing-page";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function IndexPage() {
  const viewer = await getViewer();
  if (viewer) redirect("/home");
  return <LandingPage />;
}
