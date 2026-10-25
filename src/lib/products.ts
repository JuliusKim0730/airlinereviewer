// Travel products for a destination, from partner programs.
//
// Order of preference for each of the 3 slots:
//  1. Curated items (src/data/products.json): affiliate links copied from the
//     partner dashboards, so real products show before any API is approved.
//  2. One search card per partner, linking to that city's listings. URL
//     templates and affiliate parameters come from environment variables, so
//     tracking codes can be added without code changes.
// When a partner API is approved, add an adapter that returns Product[] and
// put it ahead of the curated list.

export type PartnerId = "myrealtrip" | "klook" | "monkeytravel";

export interface Product {
  partner: PartnerId;
  partnerName: string;
  title: string;
  subtitle: string;
  url: string;
  imageUrl?: string;
  priceText?: string;
}

interface Partner {
  id: PartnerId;
  name: string;
  envPrefix: string;
  defaultTemplate: string;
  label: string;
}

const PARTNERS: Partner[] = [
  { id: "myrealtrip", name: "마이리얼트립", envPrefix: "MYREALTRIP", defaultTemplate: "https://www.myrealtrip.com/", label: "투어·티켓" },
  { id: "klook", name: "Klook", envPrefix: "KLOOK", defaultTemplate: "https://www.klook.com/ko/search/result/?query={query}", label: "액티비티·입장권" },
  { id: "monkeytravel", name: "몽키트래블", envPrefix: "MONKEYTRAVEL", defaultTemplate: "https://www.monkeytravel.com/", label: "현지 투어·픽업" },
];

type Env = Record<string, string | undefined>;

export function partnerUrl(template: string, query: string, affiliateParams?: string): string {
  const url = template.replace("{query}", encodeURIComponent(query));
  if (!affiliateParams) return url;
  return url + (url.includes("?") ? "&" : "?") + affiliateParams.replace(/^[?&]/, "");
}

export function partnerSearchCards(city: string, env: Env): Product[] {
  return PARTNERS.map((p) => ({
    partner: p.id,
    partnerName: p.name,
    title: `${city} ${p.label}`,
    subtitle: `${p.name}에서 ${city} 상품 보기`,
    url: partnerUrl(env[`${p.envPrefix}_SEARCH_URL`] || p.defaultTemplate, city, env[`${p.envPrefix}_AFFILIATE_PARAMS`] || undefined),
  }));
}

export function pickProducts(city: string, curated: Product[], env: Env, limit = 3): Product[] {
  const picked = curated.slice(0, limit);
  for (const card of partnerSearchCards(city, env)) {
    if (picked.length >= limit) break;
    if (!picked.some((p) => p.partner === card.partner)) picked.push(card);
  }
  return picked.slice(0, limit);
}
