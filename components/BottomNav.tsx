"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="bottomnav">
      <Link href="/" className={path === "/" ? "active" : ""}>
        <span className="ico">🏠</span>
        Viewings
      </Link>
      <Link href="/viewing/new" className="newbtn">
        <span className="ico">+</span>
        New
      </Link>
      <Link href="/compare" className={path === "/compare" ? "active" : ""}>
        <span className="ico">📊</span>
        Compare
      </Link>
    </nav>
  );
}
