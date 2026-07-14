"use client";

import { useEffect, useState } from "react";

type HouseholdOption = { id: string; name: string; role: "owner" | "editor" };

export function HouseholdSwitcher() {
  const [households, setHouseholds] = useState<HouseholdOption[]>([]);
  const [activeId, setActiveId] = useState("");
  const [status, setStatus] = useState("読み込んでいます");

  useEffect(() => {
    void fetch("/api/households/active", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("load_failed");
        return response.json() as Promise<{
          activeHouseholdId: string;
          households: HouseholdOption[];
        }>;
      })
      .then((data) => {
        setHouseholds(data.households);
        setActiveId(data.activeHouseholdId);
        setStatus("");
      })
      .catch(() => setStatus("おうちを読み込めませんでした。"));
  }, []);

  async function switchHousehold(householdId: string) {
    setStatus("切り替えています");
    const response = await fetch("/api/households/active", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ householdId }),
    });
    if (!response.ok) {
      setStatus("おうちを切り替えられませんでした。");
      return;
    }
    setActiveId(householdId);
    setStatus("切り替えました");
    window.location.reload();
  }

  return (
    <div>
      <select
        aria-label="利用するおうち"
        value={activeId}
        disabled={!activeId || households.length < 2}
        onChange={(event) => void switchHousehold(event.target.value)}
      >
        {households.map((household) => (
          <option value={household.id} key={household.id}>
            {household.name}（{household.role === "owner" ? "所有者" : "編集者"}
            ）
          </option>
        ))}
      </select>
      {status ? (
        <p className="small muted" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}
