"use client";
import { useGeo } from "@/hooks/useGeo";
import { useWalkData } from "@/hooks/useWalkData";
import WalkView from "@/components/walk/WalkView";
import AppShell from "@/components/layout/AppShell";

const DEFAULT_LAT = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? "25.4358");
const DEFAULT_LNG = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LNG ?? "81.8463");

export default function ExplorePage() {
  const { geo } = useGeo();

  // Use GPS coords once available; fall back to env-defined defaults while loading
  const lat = geo.lat ?? DEFAULT_LAT;
  const lng = geo.lng ?? DEFAULT_LNG;

  // 50km radius covers all localities around the default city
  const { localities, loading: dataLoading } = useWalkData(lat, lng, 50000);

  // Show loading until we have BOTH a location AND the walk data
  const loading = geo.loading || dataLoading;

  return (
    <AppShell activeTab="walk">
      <WalkView
        localities={localities}
        loading={loading}
        userLat={lat}
        userLng={lng}
        userLocality={geo.locality ?? ""}
        gpsError={geo.error}
      />
    </AppShell>
  );
}
