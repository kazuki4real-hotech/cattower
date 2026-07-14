import { redirect } from "next/navigation";

import { OnboardingProfileForm } from "@/components/onboarding-profile-form";
import { OnboardingShell } from "@/components/onboarding-shell";
import { getOnboardingSnapshot } from "@/lib/onboarding";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const snapshot = await getOnboardingSnapshot(
    viewer.db,
    viewer.session.user.id,
    viewer.household.id,
  );
  if (snapshot.completed) redirect("/home");
  return (
    <OnboardingShell current={1}>
      <h1>なんとお呼びしましょう？</h1>
      <p className="lede">
        記録や家族への表示に使います。あとから変更できます。
      </p>
      <OnboardingProfileForm initialName={viewer.session.user.name} />
    </OnboardingShell>
  );
}
