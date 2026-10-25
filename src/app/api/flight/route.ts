// Actual aircraft and status for a flight, via AeroDataBox (RapidAPI).
// Without AERODATABOX_API_KEY the route answers { configured: false } and the
// app simply shows the boarding-pass data.

interface FlightInfo {
  configured: boolean;
  aircraft?: string;
  registration?: string;
  airline?: string;
  status?: string;
}

const cache = new Map<string, { at: number; info: FlightInfo }>();
const TTL_MS = 6 * 3600e3;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const carrier = (searchParams.get("carrier") ?? "").toUpperCase();
  const number = searchParams.get("number") ?? "";
  const date = searchParams.get("date") ?? "";
  if (!/^[A-Z0-9]{2,3}$/.test(carrier) || !/^\d{1,4}[A-Z]?$/.test(number) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "carrier, number, date가 필요합니다." }, { status: 400 });
  }

  const key = process.env.AERODATABOX_API_KEY;
  if (!key) return Response.json({ configured: false } satisfies FlightInfo);

  const cacheKey = `${carrier}${number}/${date}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL_MS) return Response.json(hit.info);

  try {
    const res = await fetch(`https://aerodatabox.p.rapidapi.com/flights/number/${carrier}${number}/${date}`, {
      headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com" },
    });
    if (!res.ok) return Response.json({ configured: true } satisfies FlightInfo);
    const flights = (await res.json()) as {
      aircraft?: { model?: string; reg?: string };
      airline?: { name?: string };
      status?: string;
    }[];
    const f = flights[0];
    const info: FlightInfo = {
      configured: true,
      aircraft: f?.aircraft?.model,
      registration: f?.aircraft?.reg,
      airline: f?.airline?.name,
      status: f?.status,
    };
    cache.set(cacheKey, { at: Date.now(), info });
    return Response.json(info);
  } catch {
    return Response.json({ configured: true } satisfies FlightInfo);
  }
}
