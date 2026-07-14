import { OnboardingCatForm } from "@/components/onboarding-cat-form";
import { OnboardingShell } from "@/components/onboarding-shell";

export default function CatPage() { return <OnboardingShell current={1}><p className="eyebrow">猫を迎える</p><h1>ここで暮らす猫を、教えてください。</h1><p className="lede">名前と色が決まると、この子の部屋がひらきます。</p><OnboardingCatForm /></OnboardingShell>; }
