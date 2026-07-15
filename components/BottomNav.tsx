"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const path = usePathname();
  const active = (p: string) => (path === p ? "active" : "");
  return (
    <nav className="bottomnav">
      <Link href="/" className={active("/")}>
        <span className="ico">🏠</span>
        Viewings
      </Link>
      <Link href="/compare" className={active("/compare")}>
        <span className="ico">📊</span>
        Compare
      </Link>
      <Link href="/viewing/new" className="newbtn">
        <span className="ico">+</span>
        New
      </Link>
      <Link href="/purchase" className={active("/purchase")}>
        <span className="ico">🔑</span>
        Purchase
      </Link>
      <Link href="/settings" className={active("/settings")}>
        <span className="ico">⚙️</span>
        Settings
      </Link>
    </nav>
  );
}
