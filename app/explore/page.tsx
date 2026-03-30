"use client";
import { useEffect, useState } from "react";
import { useGeo } from "@/hooks/useGeo";
import { useWalkData } from "@/hooks/useWalkData";
import WalkView from "@/components/walk/WalkView";
import AppShell from "@/components/layout/AppShell";
import { useLocalityStreak } from "@/hooks/useLocalityStreak";

export default function ExplorePage() {
  const { geo, detect } = useGeo();
  const { localities, loading } = useWalkData(geo.lat ?? 25.4358, geo.lng ?? 81.8463, 50000);
  const [asked, setAsked] = useState(false);
const { trackVisit } = useLocalityStreak();
  useEffect(() => {
    if (!asked) { setAsked(true); detect(); }
  }, [asked, detect]);

useEffect(() => {
  if (!geo.locality) return;
  trackVisit(geo.locality);
}, [geo.locality, trackVisit]);

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
