"use client";
import { useEffect, useState } from "react";
import { useGeo } from "@/hooks/useGeo";
import { useWalkData } from "@/hooks/useWalkData";
import WalkView from "@/components/walk/WalkView";
import AppShell from "@/components/layout/AppShell";

const DEFAULT_LAT = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? "25.4358");
const DEFAULT_LNG = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LNG ?? "81.8463");

export default function ExplorePage() {
  const { geo, detect } = useGeo();
  const [asked, setAsked] = useState(false);

  // Use GPS if available, otherwise fall back to Prayagraj
  const lat = geo.lat ?? DEFAULT_LAT;
  const lng = geo.lng ?? DEFAULT_LNG;

  // 50km radius — covers all Prayagraj localities from anywhere in the city
  const { localities, loading } = useWalkData(lat, lng, 50000);

  useEffect(() => {
    if (!asked) { setAsked(true); detect(); }
  }, [asked, detect]);

  return (
    <AppShell activeTab="walk">
      <WalkView
        localities={localities}
        loading={loading}
        userLat={lat}
        userLng={lng}
        userLocality={geo.locality ?? "Prayagraj"}
        gpsError={geo.error}
      />
    </AppShell>
  );
}
