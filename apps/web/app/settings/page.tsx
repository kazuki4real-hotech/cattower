import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@cattower/ui";
import { SettingsExperience } from "@/components/settings-experience";
import { getCurrentCatOverview } from "@/lib/cats";

export default async function SettingsPage() {
  const catOverview = await getCurrentCatOverview();
  return (
    <AppShell>
      <PageHeading
        eyebrow="管理"
        title="家族と設定"
        description="公開範囲と参加の同意は、別々に管理します。"
      />
      <SettingsExperience catOverview={catOverview} />
    </AppShell>
  );
}
