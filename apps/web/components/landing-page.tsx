"use client";

import Image from "next/image";
import { useState } from "react";

import { GoogleSignInButton } from "@/components/google-sign-in-button";

const BACKGROUNDS = [
  { id: "snow", name: "Snow", token: "neutral-0", hex: "#ffffff" },
  { id: "polar", name: "Polar", token: "neutral-50", hex: "#f7f7f7" },
] as const;

type BackgroundId = (typeof BACKGROUNDS)[number]["id"];

export function LandingPage() {
  const [background, setBackground] = useState<BackgroundId>("polar");

  return (
    <main className="landing-page" data-background={background}>
      <header className="landing-header">
        <div className="brand landing-brand" aria-label="cattower">
          <span className="brand-mark" aria-hidden="true">
            T
          </span>
          cattower
        </div>
        <div className="background-picker" aria-label="背景色を選ぶ">
          <span className="background-picker-label">背景を比べる</span>
          <div className="background-options">
            {BACKGROUNDS.map((option) => (
              <button
                key={option.id}
                className="background-option"
                type="button"
                aria-pressed={background === option.id}
                onClick={() => setBackground(option.id)}
              >
                <span
                  className="background-swatch"
                  data-swatch={option.id}
                  aria-hidden="true"
                />
                <span>
                  <strong>{option.name}</strong>
                  <small>{option.hex}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-copy">
          <p className="landing-eyebrow">PRIVATE MEMORIES FOR YOUR CAT</p>
          <h1>うちの子との時間を、忘れない場所。</h1>
          <p className="landing-lede">
            写真も、ひとことも、好きなものも。誰かの反応を気にせず、猫との何気ない毎日を自分たちのために残せます。
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
