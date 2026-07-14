import { OnboardingPreferencesForm } from "@/components/onboarding-preferences-form";
import { OnboardingShell } from "@/components/onboarding-shell";
import { getOnboardingSnapshot } from "@/lib/onboarding";
import { getViewer } from "@/lib/viewer";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export default async function PreferencesPage() { const viewer = await getViewer(); if (!viewer) redirect("/onboarding/welcome"); const snapshot = await getOnboardingSnapshot(viewer.db, viewer.session.user.id, viewer.household.id); return <OnboardingShell current={2}><p className="eyebrow">残したい時間</p><h1>最初の収蔵棚を、選んでください。</h1><p className="lede">選ばなかった棚も、あとから自由に追加できます。</p><OnboardingPreferencesForm initial={snapshot.memoryPreferences} /></OnboardingShell>; }
