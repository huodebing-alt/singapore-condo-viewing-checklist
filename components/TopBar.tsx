"use client";

import Link from "next/link";

export default function TopBar({
  title,
  back,
  right,
}: {
  title: string;
  back?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="topbar">
      <div className="shell">
        {back ? (
          <Link href={back} aria-label="Back" style={{ fontSize: 20 }}>
            ‹
          </Link>
        ) : (
          <span className="logo">🌿</span>
        )}
        <h1>{title}</h1>
        {right}
      </div>
    </header>
  );
}
