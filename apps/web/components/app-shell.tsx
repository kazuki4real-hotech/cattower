import type { ReactNode } from "react";

import { AppShellClient } from "@/components/app-shell-client";
import { getCurrentCatOverview } from "@/lib/cats";

export async function AppShell({
  children,
  narrow = false,
  wide = false,
}: {
  children: ReactNode;
  narrow?: boolean;
  wide?: boolean;
}) {
  const overview = await getCurrentCatOverview();
  return (
    <AppShellClient
      cats={overview?.cats ?? []}
      activeCatId={overview?.activeCatId ?? null}
      narrow={narrow}
      wide={wide}
    >
      {children}
    </AppShellClient>
  );
}
