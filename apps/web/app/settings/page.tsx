import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@cattower/ui";
import { SettingsExperience } from "@/components/settings-experience";

export default function SettingsPage() { return <AppShell narrow><PageHeading eyebrow="管理" title="家族と設定" description="公開範囲と参加の同意は、別々に管理します。" /><SettingsExperience /></AppShell>; }
