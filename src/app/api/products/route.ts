import { findAirport } from "@/lib/airports";
import { pickProducts, type Product } from "@/lib/products";
import curated from "@/data/products.json";

export async function GET(request: Request) {
  const iata = (new URL(request.url).searchParams.get("city") ?? "").toUpperCase();
  const airport = findAirport(iata);
  if (!airport) return Response.json({ products: [] });
  const list = ((curated as Record<string, unknown>)[iata] as Product[] | undefined) ?? [];
  return Response.json({ products: pickProducts(airport.city, list, process.env) });
}
