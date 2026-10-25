const EARTH_RADIUS_KM = 6371;
const EARTH_CIRCUMFERENCE_KM = 40075;

export interface LatLon {
  lat: number;
  lon: number;
}

/** Great-circle distance in kilometres (haversine). */
export function greatCircleKm(a: LatLon, b: LatLon): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** How many times around the equator a total distance amounts to. */
export function laps(totalKm: number): number {
  return totalKm / EARTH_CIRCUMFERENCE_KM;
}
