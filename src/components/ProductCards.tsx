"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/products";

const PARTNER_COLOR: Record<Product["partner"], string> = {
  myrealtrip: "bg-blue-600",
  klook: "bg-orange-500",
  monkeytravel: "bg-amber-400",
};

/** Up to three partner products for a destination; tapping opens the partner site. */
export default function ProductCards({ iata, city }: { iata: string; city: string }) {
  const [state, setState] = useState<{ iata: string; products: Product[] } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/products?city=${iata}`)
      .then((r) => r.json())
      .then((d: { products: Product[] }) => alive && setState({ iata, products: d.products }))
      .catch(() => alive && setState({ iata, products: [] }));
    return () => {
      alive = false;
    };
  }, [iata]);

  const products = state?.iata === iata ? state.products : null;
  if (products && products.length === 0) return null;

  return (
    <section>
      <h3 className="mb-2 font-semibold">{city}에서 할 것</h3>
      <ul className="flex flex-col gap-2">
        {(products ?? [null, null, null]).map((p, i) =>
          p ? (
            <li key={`${p.partner}-${i}`}>
              <a href={p.url} target="_blank" rel="noopener noreferrer sponsored" className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-lg text-xs font-bold text-white ${PARTNER_COLOR[p.partner]}`}>
                  {p.partnerName.slice(0, 2)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.title}</span>
                  <span className="block truncate text-xs text-zinc-500">{p.subtitle}</span>
                </span>
                {p.priceText && <span className="text-sm font-semibold">{p.priceText}</span>}
                <span className="text-zinc-400">›</span>
              </a>
            </li>
          ) : (
            <li key={i} className="h-16 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          ),
        )}
      </ul>
      <p className="mt-1 text-[11px] text-zinc-400">제휴 링크를 통해 구매하면 티뷰가 수수료를 받을 수 있어요.</p>
    </section>
  );
}
