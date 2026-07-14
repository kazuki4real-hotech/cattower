import Image from "next/image";

import { BrandWordmark } from "@/components/brand-wordmark";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <div className="brand landing-brand">
          <BrandWordmark priority />
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-copy">
          <p className="landing-eyebrow">PRIVATE MEMORIES FOR YOUR CAT</p>
          <h1 className="visually-hidden">CatTower</h1>
          <p className="landing-lede">
            <span>写真も、ひとことも、好きなものを。</span>
            <span>
              誰かの反応を気にせず、愛猫の何気ない日常をあなたと家族の思い出に。
            </span>
          </p>
          <GoogleSignInButton />
        </div>

        <figure className="landing-visual">
          <Image
            src="/images/cattower-hero.webp"
            width={971}
            height={1619}
            priority
            sizes="(max-width: 760px) 88vw, 42vw"
            alt="猫とのかわいい瞬間を並べたCatTowerのイメージ"
          />
        </figure>
      </section>
    </main>
  );
}
