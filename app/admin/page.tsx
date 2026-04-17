"use client";
import { useEffect } from "react";

export default function AdminPage() {
  // Hard reload ensures fresh session cookies are sent to the server,
  // avoiding a second soft-nav RSC fetch through AdminLayout.
  useEffect(() => { window.location.href = "/admin/dashboard"; }, []);
  return null;
}
