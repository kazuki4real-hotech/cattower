import { redirect } from "next/navigation";

import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Icon } from "@/components/icon";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function IndexPage() {
  const viewer = await getViewer();
  if (viewer) redirect("/home");
  return (
    <main className="entry-page">
      <header className="entry-header">
        <div className="brand">
          <span className="brand-mark">T</span>cattower
        </div>
      </header>
      <section className="entry-content">
        <div className="entry-mark" aria-hidden="true">
          <Icon name="pets" />
        </div>
        <h1>猫との時間を、自分たちのために。</h1>
        <p>写真やことばを静かに残して、いつでも見つけられる場所です。</p>
        <GoogleSignInButton />
      </section>
    </main>
  );
}
