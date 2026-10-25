import { describe, expect, it } from "vitest";
import { cityActivity } from "./cityActivity";

describe("cityActivity", () => {
  it("counts each kind of activity per destination and skips unknown airports", () => {
    const result = cityActivity({
      stories: [{ iata: "BKK" }, { iata: "BKK" }, { iata: "XXX" }],
      companions: [{ iata: "BKK" }, { iata: "DAD" }],
      reviews: [{ dest: "DAD" }],
    });
    expect(result).toEqual([
      expect.objectContaining({ iata: "BKK", city: "방콕", stories: 2, companions: 1, reviews: 0 }),
      expect.objectContaining({ iata: "DAD", city: "다낭", stories: 0, companions: 1, reviews: 1 }),
    ]);
  });
});
