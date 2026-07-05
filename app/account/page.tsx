"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";

export default function AccountPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((me) => {
        if (!me.cloud) router.replace("/");
        else if (!me.authed) router.replace("/login");
        else setUsername(me.username);
      });
  }, [router]);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const r = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, next }),
    });
    const j = await r.json();
    setMsg(r.ok ? "Password changed ✓" : j.error ?? "Failed");
    if (r.ok) {
      setCurrent("");
      setNext("");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (!username) return <TopBar title="Account" back="/" />;

  return (
    <>
      <TopBar title="Account" back="/" />
      <div className="shell" style={{ maxWidth: 420 }}>
        <div className="card">
          <h2>👤 {username}</h2>
          <p className="muted">Signed in to cloud storage.</p>
          <div className="spacer" />
          <button className="btn ghost block" onClick={logout}>
            Sign out
          </button>
        </div>
        <div className="card">
          <h2>Change password</h2>
          <form onSubmit={changePassword}>
            <label className="field">
              <span className="lbl">Current password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="lbl">New password (min 8 chars)</span>
              <input
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                minLength={8}
                required
              />
            </label>
            {msg && <p style={{ fontSize: 13, margin: "8px 0" }}>{msg}</p>}
            <button className="btn primary block">Change password</button>
          </form>
        </div>
      </div>
    </>
  );
}
