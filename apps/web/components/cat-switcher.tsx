"use client";

import { useState } from "react";

import { Icon } from "@/components/icon";

type CatOption = { id: string; name: string };

export function CatSwitcher({
  cats: initialCats,
  activeCatId,
  compact = false,
}: {
  cats: CatOption[];
  activeCatId: string | null;
  compact?: boolean;
}) {
  const cats = initialCats;
  const [activeId, setActiveId] = useState(activeCatId ?? "");
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
