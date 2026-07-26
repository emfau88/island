import { describe, expect, it } from "vitest";
import { ROUTES } from "../../src/data/routes";

describe("road routes", () => {
  it("uses dense smoothed paths instead of long cross-island chords", () => {
    for (const route of ROUTES) {
      expect(route.points.length).toBeGreaterThan(30);
      const longestSegment = route.points.slice(1).reduce(
        (longest, point, index) => {
          const previous = route.points[index];
          if (!previous) return longest;
          return Math.max(
            longest,
            Math.hypot(point.x - previous.x, point.y - previous.y),
          );
        },
        0,
      );
      expect(longestSegment).toBeLessThan(55);
    }
  });

  it("keeps every vehicle point inside the island road corridor bounds", () => {
    for (const route of ROUTES) {
      for (const point of route.points) {
        expect(point.x).toBeGreaterThanOrEqual(500);
        expect(point.x).toBeLessThanOrEqual(1_450);
        expect(point.y).toBeGreaterThanOrEqual(500);
        expect(point.y).toBeLessThanOrEqual(2_750);
      }
    }
  });
});
