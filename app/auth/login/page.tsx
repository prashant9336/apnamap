"use client";

import { Suspense } from "react";
import LoginInner from "./LoginInner";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>
      <LoginInner />
    </Suspense>
  );
}