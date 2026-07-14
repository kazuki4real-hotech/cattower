import { redirect } from "next/navigation";

import { OnboardingPhotoForm } from "@/components/onboarding-photo-form";
import { OnboardingShell } from "@/components/onboarding-shell";
import { getOnboardingSnapshot } from "@/lib/onboarding";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function PhotoPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const snapshot = await getOnboardingSnapshot(
    viewer.db,
    viewer.session.user.id,
    viewer.household.id,
  );
  if (snapshot.completed) redirect("/home");
  if (!snapshot.cat || snapshot.step < 2) redirect("/onboarding/cat");
  return (
    <OnboardingShell current={3}>
      <h1>お気に入りの一枚はありますか？</h1>
      <p className="lede">写真はあとからでも設定できます。</p>
      <OnboardingPhotoForm
        catId={snapshot.cat.id}
        catName={snapshot.cat.name}
        initialAssetId={snapshot.cat.profileAssetId}
      />
    </OnboardingShell>
  );
}
