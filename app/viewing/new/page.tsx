"use client";

import { useState } from "react";
import TopBar from "@/components/TopBar";
import ViewingForm from "@/components/ViewingForm";
import { emptyViewing } from "@/lib/types";

export default function NewViewingPage() {
  const [initial] = useState(emptyViewing);
  return (
    <>
      <TopBar title="New viewing" back="/" />
      <ViewingForm initial={initial} isNew />
    </>
  );
}
