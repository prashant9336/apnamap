"use client";

import { Suspense } from "react";
import EditShopInner from "./EditShopInner";

export const dynamic = "force-dynamic";

export default function EditShopPage() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>
      <EditShopInner />
    </Suspense>
  );
}