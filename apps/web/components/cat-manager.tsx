"use client";

import { useCallback, useState, type FormEvent } from "react";

import { Icon } from "@/components/icon";

type Cat = {
  id: string;
  name: string;
  nickname: string | null;
  birthDate: string | null;
  birthPrecision: "day" | "month" | "year" | "unknown";
  adoptionDate: string | null;
  profileAssetId: string | null;
  lifeStatus: "living" | "memorial";
};
const empty = {
  name: "",
  nickname: "",
  birthDate: "",
  birthPrecision: "unknown",
  adoptionDate: "",
  lifeStatus: "living",
};

export function CatManager({
  initialCats,
  initialActiveCatId,
  initialCanManage,
}: {
  initialCats: Cat[];
  initialActiveCatId: string | null;
  initialCanManage: boolean;
}) {
  const [cats, setCats] = useState<Cat[]>(initialCats);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialActiveCatId ?? initialCats[0]?.id ?? null,
  );
  const [canManage, setCanManage] = useState(initialCanManage);
  const [status, setStatus] = useState("");
  const applyData = useCallback(
    (data: { cats: Cat[]; activeCatId: string | null; canManage: boolean }) => {
      setCats(data.cats);
      setCanManage(data.canManage);
      setSelectedId((current) =>
        current && data.cats.some((cat) => cat.id === current)
          ? current
          : (data.activeCatId ?? data.cats[0]?.id ?? null),
      );
      setStatus("");
    },
    [],
  );
  const load = useCallback(async () => {
    const response = await fetch("/api/cats", { cache: "no-store" });
    if (!response.ok) throw new Error("load_failed");
    applyData(
      (await response.json()) as {
        cats: Cat[];
        activeCatId: string | null;
        canManage: boolean;
      },
    );
  }, [applyData]);
  const selected = cats.find((cat) => cat.id === selectedId) ?? null;
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("保存しています");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    const response = await fetch(
      selected ? `/api/cats/${selected.id}` : "/api/cats",
      {
        method: selected ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) {
      setStatus("入力内容を確認してください。");
      return;
    }
    setStatus("保存しました");
    await load();
  }
  const values = selected
    ? {
        ...selected,
        nickname: selected.nickname ?? "",
        birthDate: selected.birthDate ?? "",
        adoptionDate: selected.adoptionDate ?? "",
      }
    : empty;
  return (
    <div className="cat-manager">
      <div className="cat-manager-list">
        <div className="cat-manager-list-head">
          <h3>登録している猫</h3>
          {canManage ? (
            <button
              className="button button-secondary"
              type="button"
              onClick={() => setSelectedId(null)}
            >
              <Icon name="add" />
              追加
            </button>
          ) : null}
        </div>
        {cats.length ? (
          cats.map((cat) => (
            <button
              type="button"
              className="cat-manager-item"
              data-active={cat.id === selectedId}
              onClick={() => setSelectedId(cat.id)}
              key={cat.id}
            >
              <Icon name="pets" filled />
              <span>
                <strong>{cat.name}</strong>
                <small>{cat.nickname || "プロフィールを編集"}</small>
              </span>
            </button>
          ))
        ) : (
          <p className="muted">まだ猫が登録されていません。</p>
        )}
      </div>
      <form
        className="cat-profile-form"
        key={selected?.id ?? "new"}
        onSubmit={save}
      >
        <div>
          <h3>{selected ? `${selected.name}のプロフィール` : "猫を追加"}</h3>
          <p className="muted">
            日付がわからない項目は空欄のままで大丈夫です。
          </p>
        </div>
        <div className="form-grid">
          <label>
            名前
            <input
              name="name"
              required
              maxLength={50}
              defaultValue={values.name}
              disabled={!canManage}
            />
          </label>
          <label>
            呼び名
            <input
              name="nickname"
              maxLength={50}
              defaultValue={values.nickname}
              disabled={!canManage}
            />
          </label>
          <label>
            誕生日の精度
            <select
              name="birthPrecision"
              defaultValue={values.birthPrecision}
              disabled={!canManage}
            >
              <option value="unknown">わからない</option>
              <option value="year">年まで</option>
              <option value="month">月まで</option>
              <option value="day">日まで</option>
            </select>
          </label>
          <label>
            誕生日
            <input
              type="date"
              name="birthDate"
              defaultValue={values.birthDate}
              disabled={!canManage}
            />
          </label>
          <label>
            迎えた日
            <input
              type="date"
              name="adoptionDate"
              defaultValue={values.adoptionDate}
              disabled={!canManage}
            />
          </label>
          <label>
            状態
            <select
              name="lifeStatus"
              defaultValue={values.lifeStatus}
              disabled={!canManage}
            >
              <option value="living">一緒に暮らしている</option>
              <option value="memorial">思い出として残す</option>
            </select>
          </label>
        </div>
        {canManage ? (
          <div className="button-row">
            <button className="button" type="submit">
              保存
            </button>
          </div>
        ) : (
          <p className="muted">猫のプロフィール変更は所有者だけが行えます。</p>
        )}
        {status ? (
          <p className="small muted" role="status">
            {status}
          </p>
        ) : null}
      </form>
    </div>
  );
}
