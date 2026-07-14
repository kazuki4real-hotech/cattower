import { OnboardingCatForm } from "@/components/onboarding-cat-form";
import { OnboardingShell } from "@/components/onboarding-shell";
import { getOnboardingSnapshot } from "@/lib/onboarding";
import { getViewer } from "@/lib/viewer";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export default async function CatPage() { const viewer = await getViewer(); if (!viewer) redirect("/onboarding/welcome"); const snapshot = await getOnboardingSnapshot(viewer.db, viewer.session.user.id, viewer.household.id); return <OnboardingShell current={1}><p className="eyebrow">猫を登録</p><h1>一緒に暮らす猫を、教えてください。</h1><p className="lede">まずは名前とテーマ色だけで始められます。</p><OnboardingCatForm initialName={snapshot.cat?.name} initialTheme={snapshot.cat?.themeColor} /></OnboardingShell>; }
