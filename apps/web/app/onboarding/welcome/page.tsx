import Link from "next/link";

import { Icon } from "@/components/icon";
import { OnboardingShell } from "@/components/onboarding-shell";

export default function WelcomePage() { return <OnboardingShell current={0}><p className="eyebrow">ようこそ</p><h1>猫との時間のための、小さな居場所を作ります。</h1><p className="lede">まずは、あなたの呼び名を教えてください。あとから変更できます。</p><form className="onboarding-form"><div className="field"><label htmlFor="display-name">あなたの呼び名</label><input id="display-name" required defaultValue="かずき" /></div><div className="onboarding-actions"><Link className="button" href="/onboarding/cat">次へ進む<Icon name="arrow_forward" /></Link></div></form></OnboardingShell>; }
