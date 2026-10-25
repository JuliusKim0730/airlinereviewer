import { findAirport } from "./airports";

export interface CityActivity {
  iata: string;
  city: string;
  lat: number;
  lon: number;
  stories: number;
  companions: number;
  reviews: number;
}

/** Group stories, companion posts and reviews by destination airport for the map. */
export function cityActivity(input: {
  stories: { iata: string }[];
  companions: { iata: string }[];
  reviews: { dest: string }[];
}): CityActivity[] {
  const byCity = new Map<string, CityActivity>();
  const bump = (iata: string, key: "stories" | "companions" | "reviews") => {
    const airport = findAirport(iata);
    if (!airport) return;
    const entry =
      byCity.get(airport.iata) ??
      { iata: airport.iata, city: airport.city, lat: airport.lat, lon: airport.lon, stories: 0, companions: 0, reviews: 0 };
    entry[key]++;
    byCity.set(airport.iata, entry);
  };
  input.stories.forEach((s) => bump(s.iata, "stories"));
  input.companions.forEach((c) => bump(c.iata, "companions"));
  input.reviews.forEach((r) => bump(r.dest, "reviews"));
  return [...byCity.values()];
}
