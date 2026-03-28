"use client";

import { Suspense } from "react";
import OffersInner from "./OffersInner";

export const dynamic = "force-dynamic";

export default function OffersPage() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>
      <OffersInner />
    </Suspense>
  );
}