import { redirect } from "next/navigation";

import { OnboardingShell } from "@/components/onboarding-shell";
import { OnboardingThemeForm } from "@/components/onboarding-theme-form";
import { getOnboardingSnapshot } from "@/lib/onboarding";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function ThemePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const snapshot = await getOnboardingSnapshot(
    viewer.db,
    viewer.session.user.id,
    viewer.household.id,
  );
  if (snapshot.completed) redirect("/home");
  if (!snapshot.cat || snapshot.step < 3) redirect("/onboarding/photo");
  return (
    <OnboardingShell current={4}>
      <h1>この子の色を選びましょう</h1>
      <p className="lede">記録の目印になる色です。あとから変更できます。</p>
      <OnboardingThemeForm initialTheme={snapshot.cat.themeColor} />
    </OnboardingShell>
  );
}
