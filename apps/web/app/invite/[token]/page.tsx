import type { Metadata } from "next";
import { createDatabase } from "@cattower/db";

import { AcceptInviteButton } from "@/components/accept-invite-button";
import { BrandWordmark } from "@/components/brand-wordmark";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { getRuntimeEnv } from "@/lib/cloudflare";
import { getInvite, inviteState } from "@/lib/invites";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = {
  title: "家族への招待",
  referrer: "no-referrer",
  robots: { index: false, follow: false, noarchive: true },
};
export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const db = createDatabase(getRuntimeEnv().DB);
  const found = await getInvite(db, token);
  const state = found ? inviteState(found.invite) : "invalid";
  const viewer = await getViewer();
  return (
    <main className="invite-page">
      <div className="invite-card">
        <div className="invite-brand">
          <BrandWordmark priority />
        </div>
        <p className="eyebrow">家族への招待</p>
        {state === "active" && found ? (
          <>
            <h1>{found.householdName}へ参加</h1>
            <p>編集者として、猫の記録を一緒に残せます。</p>
            {viewer ? (
              <AcceptInviteButton token={token} />
            ) : (
              <GoogleSignInButton
                callbackURL={`/auth/continue?returnTo=${encodeURIComponent(`/invite/${token}`)}`}
              />
            )}
          </>
        ) : (
          <>
            <h1>この招待は利用できません</h1>
            <p>
              {state === "accepted"
                ? "この招待はすでに承認されています。"
                : state === "expired"
                  ? "招待の有効期限が切れています。"
                  : state === "revoked"
                    ? "この招待は取り消されています。"
                    : "招待リンクを確認してください。"}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
