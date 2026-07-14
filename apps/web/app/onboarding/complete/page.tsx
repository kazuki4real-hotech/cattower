import { Icon } from "@/components/icon";
import { OnboardingCompleteActions } from "@/components/onboarding-complete-actions";
import { OnboardingShell } from "@/components/onboarding-shell";
import { getOnboardingSnapshot } from "@/lib/onboarding";
import { getViewer } from "@/lib/viewer";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export default async function CompletePage() { const viewer = await getViewer(); if (!viewer) redirect("/onboarding/welcome"); const snapshot = await getOnboardingSnapshot(viewer.db, viewer.session.user.id, viewer.household.id); if (!snapshot.cat) redirect("/onboarding/cat"); return <OnboardingShell current={3} complete><div className="completion-mark"><Icon name="check_circle" filled /></div><p className="eyebrow">できあがりました</p><h1>{snapshot.cat.name}との居場所ができました。</h1><p className="lede">最初の記録は、今日の一枚からでも、ひとことだけでも大丈夫です。</p><OnboardingCompleteActions /></OnboardingShell>; }
