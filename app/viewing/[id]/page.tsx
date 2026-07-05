"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import ViewingForm from "@/components/ViewingForm";
import { getViewing } from "@/lib/store";
import type { Viewing } from "@/lib/types";

export default function EditViewingPage() {
  const { id } = useParams<{ id: string }>();
  const [viewing, setViewing] = useState<Viewing | null | "missing">(null);

  useEffect(() => {
    getViewing(id).then((v) => setViewing(v ?? "missing"));
  }, [id]);

  if (viewing === null) {
    return (
      <>
        <TopBar title="Viewing" back="/" />
        <p className="muted" style={{ padding: 24, textAlign: "center" }}>
          Loading…
        </p>
      </>
    );
  }
  if (viewing === "missing") {
    return (
      <>
        <TopBar title="Viewing" back="/" />
        <div className="empty shell">
          <div className="big">🔍</div>
          <p>Viewing not found.</p>
          <p>
            <Link href="/">Back to list</Link>
          </p>
        </div>
      </>
    );
  }
  return (
    <>
      <TopBar title={viewing.condoName || "Viewing"} back="/" />
      <ViewingForm initial={viewing} isNew={false} />
    </>
  );
}
