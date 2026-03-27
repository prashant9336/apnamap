"use client";
import { useEffect, useState } from "react";
import { useGeo } from "@/hooks/useGeo";
import { useWalkData } from "@/hooks/useWalkData";
import WalkView from "@/components/walk/WalkView";
import AppShell from "@/components/layout/AppShell";

export default function ExplorePage() {
  const { geo, detect } = useGeo();
  const { localities, loading } = useWalkData(geo.lat ?? 25.4358, geo.lng ?? 81.8463, 50000);
  const [asked, setAsked] = useState(false);

  useEffect(() => {
    if (!asked) { setAsked(true); detect(); }
  }, [asked, detect]);

  return (
    <AppShell activeTab="walk">
      <WalkView
        localities={localities}
        loading={loading}
        userLat={geo.lat ?? 25.4358}
        userLng={geo.lng ?? 81.8463}
        userLocality={geo.locality ?? "Prayagraj"}
        gpsError={geo.error}
      />
    </AppShell>
  );
}
