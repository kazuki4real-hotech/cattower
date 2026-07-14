import { redirect } from "next/navigation";

import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { OnboardingProfileForm } from "@/components/onboarding-profile-form";
import { OnboardingShell } from "@/components/onboarding-shell";
import { getOnboardingSnapshot } from "@/lib/onboarding";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const viewer = await getViewer();
  if (!viewer) return <OnboardingShell current={0}><p className="eyebrow">ようこそ</p><h1>猫との時間を残す、おうちを作ります。</h1><p className="lede">Googleでログインして始めます。</p><GoogleSignInButton /></OnboardingShell>;
  const snapshot = await getOnboardingSnapshot(viewer.db, viewer.session.user.id, viewer.household.id);
  if (snapshot.completed) redirect("/home");
  if (snapshot.step === 1) redirect("/onboarding/cat");
  if (snapshot.step >= 2) redirect("/onboarding/complete");
  return <OnboardingShell current={0}><p className="eyebrow">ようこそ</p><h1>猫との時間を残す、おうちを作ります。</h1><p className="lede">まずは、あなたの呼び名を教えてください。あとから変更できます。</p><OnboardingProfileForm initialName={viewer.session.user.name} /></OnboardingShell>;
}
