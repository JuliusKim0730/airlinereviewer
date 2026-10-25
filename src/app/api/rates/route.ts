// KRW per unit of each travel currency, from the ECB reference rates (Frankfurter).
// Currencies the ECB doesn't publish (VND, TWD) and offline use fall back to rough
// fixed rates, flagged as approximate.

const APPROX_KRW: Record<string, number> = {
  USD: 1400,
  EUR: 1500,
  GBP: 1800,
  JPY: 9.3,
  THB: 41,
  VND: 0.055,
  PHP: 24,
  TWD: 44,
  HKD: 180,
  SGD: 1050,
  CAD: 1000,
};

const cache = new Map<string, { at: number; body: unknown }>();

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date");
  const when = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "latest";
  const hit = cache.get(when);
  if (hit && Date.now() - hit.at < 3600e3) return Response.json(hit.body);

  const rates: Record<string, number> = { ...APPROX_KRW };
  const approximate = new Set(Object.keys(APPROX_KRW));
  try {
    const res = await fetch(`https://api.frankfurter.app/${when}?from=KRW`);
    if (res.ok) {
      const data = (await res.json()) as { rates: Record<string, number> };
      for (const [cur, perKrw] of Object.entries(data.rates)) {
        if (perKrw > 0) {
          rates[cur] = 1 / perKrw;
          approximate.delete(cur);
        }
      }
    }
  } catch {
    // keep approximate rates
  }
  const body = { date: when, rates, approximate: [...approximate] };
  cache.set(when, { at: Date.now(), body });
  return Response.json(body);
}
