// Static travel facts per destination: what kind of place it is, its currency,
// and a rough month-by-month season guide. Seasons are approximate.

export type CityTag = "food" | "beach" | "city" | "culture" | "nature" | "shopping" | "nightlife";

/** One character per month, Jan..Dec: G good, H hot, R rainy, C cold, M mild/mixed. */
type SeasonString = string;

interface CityInfo {
  tags: CityTag[];
  currency: string;
  seasons: SeasonString;
}

const INFO: Record<string, CityInfo> = {
  BKK: { tags: ["food", "nightlife", "city"], currency: "THB", seasons: "GGHHHRRRRRGG" },
  DAD: { tags: ["beach", "food"], currency: "VND", seasons: "MGGGHHHHRRRM" },
  SGN: { tags: ["food", "city"], currency: "VND", seasons: "GGGHRRRRRRMG" },
  HAN: { tags: ["food", "culture"], currency: "VND", seasons: "CCMGHRRRGGGC" },
  CEB: { tags: ["beach", "nature"], currency: "PHP", seasons: "GGGGHRRRRRMG" },
  NRT: { tags: ["city", "food", "shopping"], currency: "JPY", seasons: "CCGGGRHHMGGC" },
  HND: { tags: ["city", "food", "shopping"], currency: "JPY", seasons: "CCGGGRHHMGGC" },
  KIX: { tags: ["food", "culture", "shopping"], currency: "JPY", seasons: "CCGGGRHHMGGC" },
  FUK: { tags: ["food", "city"], currency: "JPY", seasons: "CCGGGRHHMGGC" },
  TPE: { tags: ["food", "nightlife", "city"], currency: "TWD", seasons: "MMGGRRHHRGGM" },
  HKG: { tags: ["city", "shopping", "food"], currency: "HKD", seasons: "MMGGRRRRRGGG" },
  SIN: { tags: ["city", "food", "shopping"], currency: "SGD", seasons: "GGGHHHHHHHRR" },
  CJU: { tags: ["nature", "beach"], currency: "KRW", seasons: "CCMGGRHHGGMC" },
  CDG: { tags: ["culture", "city", "food"], currency: "EUR", seasons: "CCMGGGHHGGMC" },
  LHR: { tags: ["culture", "city"], currency: "GBP", seasons: "CCMMGGGGGMCC" },
  FRA: { tags: ["city", "culture"], currency: "EUR", seasons: "CCMGGGGGGMCC" },
  YUL: { tags: ["city", "culture"], currency: "CAD", seasons: "CCCMGGGGGMCC" },
  LAX: { tags: ["city", "beach", "shopping"], currency: "USD", seasons: "GGGGGGHHGGGG" },
  JFK: { tags: ["city", "culture", "shopping"], currency: "USD", seasons: "CCMGGGHHGGMC" },
};

const SEASON_LABEL: Record<string, string> = {
  G: "여행하기 좋은 때",
  H: "더운 시기",
  R: "비가 잦은 시기",
  C: "추운 시기",
  M: "무난한 날씨",
};

export function cityTags(iata: string): CityTag[] {
  return INFO[iata]?.tags ?? [];
}

export function cityCurrency(iata: string): string | undefined {
  return INFO[iata]?.currency;
}

/** Season for a month (1-12), or undefined when the city is unknown. */
export function seasonAt(iata: string, month: number): { code: string; label: string } | undefined {
  const code = INFO[iata]?.seasons.at(month - 1);
  return code ? { code, label: SEASON_LABEL[code] } : undefined;
}
