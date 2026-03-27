/**
 * Calculate distance between two GPS points in metres (Haversine formula)
 */
export function getDistanceMetres(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Format distance for display: "120m" or "2.1km"
 */
export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)}m`;
  return `${(metres / 1000).toFixed(1)}km`;
}

/**
 * Reverse-geocode using free Nominatim API
 * Returns locality name
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "User-Agent": "ApnaMap/1.0" } }
    );
    const data = await res.json();
    return (
      data.address?.suburb ||
      data.address?.neighbourhood ||
      data.address?.city ||
      data.address?.town ||
      "Your Location"
    );
  } catch {
    return "Your Location";
  }
}
