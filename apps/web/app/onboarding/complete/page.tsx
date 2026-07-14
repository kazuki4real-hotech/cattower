import { Icon } from "@/components/icon";
import { OnboardingCompleteActions } from "@/components/onboarding-complete-actions";
import { OnboardingShell } from "@/components/onboarding-shell";
import { getOnboardingSnapshot } from "@/lib/onboarding";
import { getViewer } from "@/lib/viewer";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export default async function CompletePage() { const viewer = await getViewer(); if (!viewer) redirect("/onboarding/welcome"); const snapshot = await getOnboardingSnapshot(viewer.db, viewer.session.user.id, viewer.household.id); if (!snapshot.cat) redirect("/onboarding/cat"); return <OnboardingShell current={2} complete><div className="completion-mark"><Icon name="check_circle" filled /></div><p className="eyebrow">できあがりました</p><h1>{snapshot.cat.name}とのおうちができました。</h1><p className="lede">写真一枚でも、ひとことだけでも記録できます。</p><OnboardingCompleteActions /></OnboardingShell>; }
