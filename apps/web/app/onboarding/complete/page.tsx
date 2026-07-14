import Link from "next/link";

import { Icon } from "@/components/icon";
import { OnboardingShell } from "@/components/onboarding-shell";

export default function CompletePage() { return <OnboardingShell current={3} complete><div className="completion-mark"><Icon name="check_circle" filled /></div><p className="eyebrow">できあがりました</p><h1>こむぎとの居場所ができました。</h1><p className="lede">最初の記録は、今日の一枚からでも、ひとことだけでも大丈夫です。</p><div className="onboarding-actions"><Link className="button" href="/home">おうちへ入る<Icon name="arrow_forward" /></Link><Link className="button button-secondary" href="/add"><Icon name="add" />最初の記録を作る</Link></div></OnboardingShell>; }
