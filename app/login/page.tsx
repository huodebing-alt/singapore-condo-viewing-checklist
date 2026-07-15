"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";
import { setGuest } from "@/lib/store";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void;
          renderButton: (el: HTMLElement, config: object) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deviceMode, setDeviceMode] = useState(false);
  const googleBtn = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((me) => {
        if (!me.cloud) setDeviceMode(true);
        else if (me.authed) router.replace("/");
      })
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || deviceMode) return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      if (!window.google || !googleBtn.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (resp: { credential: string }) => {
          const r = await fetch("/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential: resp.credential }),
          });
          if (r.ok) {
            setGuest(false);
            router.replace("/");
          } else setError((await r.json()).error ?? "Google sign-in failed");
        },
      });
      window.google.accounts.id.renderButton(googleBtn.current, {
        theme: "outline",
        size: "large",
        width: 280,
      });
    };
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [deviceMode, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch(mode === "signin" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (r.ok) {
        setGuest(false);
        router.replace("/");
        return;
      }
      setError((await r.json()).error ?? (mode === "signin" ? "Login failed" : "Sign-up failed"));
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  function continueAsGuest() {
    setGuest(true);
    router.replace("/");
  }

  return (
    <>
      <TopBar title="Sign in" />
      <div className="shell" style={{ maxWidth: 420 }}>
        <div className="card" style={{ marginTop: 28 }}>
          <div style={{ textAlign: "center", padding: "10px 0 4px" }}>
            <div style={{ fontSize: 40 }}>🌿</div>
            <h2 style={{ marginBottom: 2 }}>CondoScout SG</h2>
            <p className="muted">Sign in to your viewing notes</p>
          </div>
          {deviceMode ? (
            <div className="banner">
              This deployment has no cloud storage configured, so no sign-in is needed — data
              stays on this device. <a href="/">Continue →</a>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="chips" style={{ justifyContent: "center", marginBottom: 12 }}>
                <button
                  type="button"
                  className={`chip${mode === "signin" ? " on" : ""}`}
                  onClick={() => setMode("signin")}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={`chip${mode === "signup" ? " on" : ""}`}
                  onClick={() => setMode("signup")}
                >
                  Create account
                </button>
              </div>
              <label className="field">
                <span className="lbl">Username</span>
                <input
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span className="lbl">
                  Password{mode === "signup" ? " (min 8 characters)" : ""}
                </span>
                <input
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  minLength={mode === "signup" ? 8 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>
              {error && (
                <p style={{ color: "var(--score-low)", fontSize: 13, margin: "8px 0" }}>{error}</p>
              )}
              <button className="btn primary block" disabled={busy} style={{ marginTop: 8 }}>
                {busy
                  ? "Working…"
                  : mode === "signin"
                    ? "Sign in"
                    : "Create account & sign in"}
              </button>
              <button
                type="button"
                className="btn ghost block"
                style={{ marginTop: 10 }}
                onClick={continueAsGuest}
              >
                Continue as guest
              </button>
              <p className="muted" style={{ fontSize: 12, marginTop: 6, textAlign: "center" }}>
                Guest data stays on this device — sign in later to upload it to the cloud.
              </p>
              {GOOGLE_CLIENT_ID ? (
                <>
                  <p className="muted" style={{ textAlign: "center", margin: "12px 0 8px" }}>
                    or
                  </p>
                  <div ref={googleBtn} style={{ display: "flex", justifyContent: "center" }} />
                </>
              ) : (
                <p className="muted" style={{ marginTop: 14, fontSize: 12 }}>
                  Google sign-in becomes available once a Google OAuth client ID is configured —
                  see README.
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </>
  );
}
