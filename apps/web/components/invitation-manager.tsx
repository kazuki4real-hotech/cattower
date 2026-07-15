"use client";

import { useCallback, useEffect, useState } from "react";

type Member = {
  userId: string;
  name: string;
  role: "owner" | "editor";
  status: string;
};
type Invite = {
  id: string;
  state: "active" | "accepted" | "expired" | "revoked";
  expiresAt: string;
  createdAt: string;
};

export function InvitationManager() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [canInvite, setCanInvite] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [status, setStatus] = useState("読み込んでいます");
  const apply = useCallback(
    (data: { members: Member[]; invites: Invite[]; canInvite: boolean }) => {
      setMembers(data.members);
      setInvites(data.invites);
      setCanInvite(data.canInvite);
      setStatus("");
    },
    [],
  );
  const load = useCallback(async () => {
    const response = await fetch("/api/household-invites", {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("load_failed");
    apply(await response.json());
  }, [apply]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/household-invites", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("load_failed");
        return response.json() as Promise<{
          members: Member[];
          invites: Invite[];
          canInvite: boolean;
        }>;
      })
      .then(apply)
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError")
          setStatus("家族の情報を読み込めませんでした。");
      });
    return () => controller.abort();
  }, [apply]);
  async function create() {
    setStatus("招待リンクを作っています");
    setInviteUrl("");
    const response = await fetch("/api/household-invites", { method: "POST" });
    const body = (await response.json().catch(() => null)) as {
      inviteUrl?: string;
      error?: string;
    } | null;
    if (!response.ok) {
      setStatus(
        response.status === 429
          ? "発行上限に達しました。1時間ほど待ってからお試しください。"
          : "招待リンクを作れませんでした。",
      );
      return;
    }
    setInviteUrl(body?.inviteUrl ?? "");
    setStatus("7日間有効なリンクを作成しました");
    await load();
  }
  async function revoke(id: string) {
    setStatus("招待を取り消しています");
    const response = await fetch(`/api/household-invites/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setStatus("招待を取り消せませんでした。");
      return;
    }
    setStatus("招待を取り消しました");
    await load();
  }
  return (
    <div className="invitation-manager">
      <div>
        <h3>参加中の家族</h3>
        <div className="family-member-list">
          {members
            .filter((member) => member.status === "active")
            .map((member) => (
              <div className="family-member" key={member.userId}>
                <span>
                  <strong>{member.name}</strong>
                  <small>{member.role === "owner" ? "所有者" : "編集者"}</small>
                </span>
              </div>
            ))}
        </div>
      </div>
      {canInvite ? (
        <div className="invite-actions">
          <div>
            <h3>家族を招待</h3>
            <p>リンクは7日間有効で、一度承認されると再利用できません。</p>
          </div>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => void create()}
          >
            招待リンクを作る
          </button>
        </div>
      ) : (
        <p className="muted">招待リンクは所有者だけが発行できます。</p>
      )}
      {inviteUrl ? (
        <div className="invite-link">
          <label>
            今回の招待リンク
            <input
              readOnly
              value={inviteUrl}
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
          <button
            className="button"
            type="button"
            onClick={() =>
              void navigator.clipboard
                .writeText(inviteUrl)
                .then(() => setStatus("リンクをコピーしました"))
            }
          >
            コピー
          </button>
          <p className="small muted">
            安全のため、このリンクは再表示できません。
          </p>
        </div>
      ) : null}
      {canInvite && invites.length ? (
        <div>
          <h3>最近の招待</h3>
          <div className="invite-list">
            {invites.map((invite) => (
              <div className="invite-row" key={invite.id}>
                <span>
                  <strong>
                    {invite.state === "active"
                      ? "承認待ち"
                      : invite.state === "accepted"
                        ? "承認済み"
                        : invite.state === "expired"
                          ? "期限切れ"
                          : "取消済み"}
                  </strong>
                  <small>
                    {new Date(invite.expiresAt).toLocaleDateString("ja-JP")}まで
                  </small>
                </span>
                {invite.state === "active" ? (
                  <button
                    className="button button-quiet"
                    type="button"
                    onClick={() => void revoke(invite.id)}
                  >
                    取り消す
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {status ? (
        <p className="small muted" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}
