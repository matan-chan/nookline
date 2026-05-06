import { mergeRecommendationIdsWithFallback } from "../src/services/recommendedBooksForBook";
import { describe, expect, test } from "bun:test";

describe("mergeRecommendationIdsWithFallback", () => {
  test("fills from second pool when first pool cannot reach cap", () => {
    const sameLib = [{ id: 1 }, { id: 2 }];
    const userWide = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }, { id: 7 }, { id: 8 }, { id: 9 }, { id: 10 }];
    const stableRng = () => 0.42;
    let ids = mergeRecommendationIdsWithFallback([], sameLib, 10, stableRng);
    expect(ids.length).toBe(2);
    ids = mergeRecommendationIdsWithFallback(ids, userWide, 10, stableRng);
    expect(ids.length).toBe(10);
    expect(new Set(ids).size).toBe(10);
  });

  test("tops up with user pool when same-library pool is empty", () => {
    const userWide = [{ id: 10 }, { id: 11 }, { id: 12 }];
    const ids = mergeRecommendationIdsWithFallback([], userWide, 3, () => 0.5);
    expect(ids.sort((a, b) => a - b)).toEqual([10, 11, 12]);
  });
});
