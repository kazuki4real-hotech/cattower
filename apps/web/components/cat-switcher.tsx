"use client";

import { useEffect, useState } from "react";

import { Icon } from "@/components/icon";

type CatOption = { id: string; name: string; archivedAt: string | null };

export function CatSwitcher({ compact = false }: { compact?: boolean }) {
  const [cats, setCats] = useState<CatOption[]>([]);
  const [activeId, setActiveId] = useState("");
  useEffect(() => {
    void fetch("/api/cats", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("load_failed");
        return response.json() as Promise<{
          cats: CatOption[];
          activeCatId: string | null;
        }>;
      })
      .then((data) => {
        setCats(data.cats.filter((cat) => !cat.archivedAt));
        setActiveId(data.activeCatId ?? "");
      })
      .catch(() => undefined);
  }, []);
  if (!activeId || cats.length === 0) return null;
  return (
    <label className={`cat-switcher${compact ? " cat-switcher-compact" : ""}`}>
      <Icon name="pets" filled />
      <span className="sr-only">表示する猫</span>
      <select
        aria-label="表示する猫"
        value={activeId}
        onChange={async (event) => {
          const catId = event.target.value;
          setActiveId(catId);
          const response = await fetch("/api/cats/active", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ catId }),
          });
          if (response.ok) window.location.reload();
        }}
      >
        {cats.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>
      <Icon name="expand_more" />
    </label>
  );
}
