import { OnboardingPreferencesForm } from "@/components/onboarding-preferences-form";
import { OnboardingShell } from "@/components/onboarding-shell";

export default function PreferencesPage() { return <OnboardingShell current={2}><p className="eyebrow">残したい時間</p><h1>最初の収蔵棚を、選んでください。</h1><p className="lede">選ばなかった棚も、あとから自由に追加できます。</p><OnboardingPreferencesForm /></OnboardingShell>; }
