import Image from "next/image";
import { redirect } from "next/navigation";

import { Icon } from "@/components/icon";
import { OnboardingCompleteActions } from "@/components/onboarding-complete-actions";
import { OnboardingShell } from "@/components/onboarding-shell";
import { getOnboardingSnapshot } from "@/lib/onboarding";
import { getOnboardingRoute } from "@/lib/onboarding-routes";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function CompletePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const snapshot = await getOnboardingSnapshot(
    viewer.db,
    viewer.session.user.id,
    viewer.household.id,
  );
  if (snapshot.completed) redirect("/home");
  if (!snapshot.cat || snapshot.step < 4)
    redirect(getOnboardingRoute(snapshot.step));
  return (
    <OnboardingShell current={4}>
      <div className="onboarding-complete-avatar">
        {snapshot.cat.profileAssetId ? (
          <Image
            src={`/api/media/${snapshot.cat.profileAssetId}?variant=profile`}
            width={96}
            height={96}
            unoptimized
            alt={`${snapshot.cat.name}のプロフィール写真`}
          />
        ) : (
          <Icon name="pets" />
        )}
      </div>
      <h1>準備ができました</h1>
      <p className="lede">
        {snapshot.cat.name}との時間を、写真一枚やひとことから残せます。
      </p>
      <OnboardingCompleteActions />
    </OnboardingShell>
  );
}
