import type { Point, RouteDefinition } from "../core/types";

function smoothRoad(controlPoints: readonly Point[], passes = 2): Point[] {
  let points = controlPoints.map((point) => ({ ...point }));
  for (let pass = 0; pass < passes; pass += 1) {
    const next: Point[] = [points[0] ?? { x: 0, y: 0 }];
    for (let index = 0; index < points.length - 1; index += 1) {
      const current = points[index];
      const following = points[index + 1];
      if (!current || !following) continue;
      next.push(
        {
          x: current.x * 0.75 + following.x * 0.25,
          y: current.y * 0.75 + following.y * 0.25,
        },
        {
          x: current.x * 0.25 + following.x * 0.75,
          y: current.y * 0.25 + following.y * 0.75,
        },
      );
    }
    next.push(points.at(-1) ?? { x: 0, y: 0 });
    points = next;
  }
  return points;
}

const coastSouth = smoothRoad([
  { x: 1_095, y: 815 },
  { x: 1_050, y: 875 },
  { x: 995, y: 930 },
  { x: 930, y: 980 },
  { x: 865, y: 1_025 },
  { x: 815, y: 1_090 },
  { x: 800, y: 1_170 },
  { x: 825, y: 1_250 },
  { x: 880, y: 1_305 },
  { x: 950, y: 1_345 },
  { x: 1_025, y: 1_385 },
  { x: 1_115, y: 1_455 },
  { x: 1_105, y: 1_535 },
  { x: 1_045, y: 1_615 },
  { x: 1_010, y: 1_700 },
  { x: 1_065, y: 1_790 },
  { x: 1_115, y: 1_885 },
  { x: 1_105, y: 1_980 },
  { x: 1_050, y: 2_075 },
  { x: 990, y: 2_165 },
  { x: 975, y: 2_255 },
  { x: 1_005, y: 2_355 },
  { x: 1_050, y: 2_455 },
  { x: 1_040, y: 2_545 },
  { x: 995, y: 2_630 },
  { x: 1_015, y: 2_695 },
  { x: 1_065, y: 2_725 },
]);

const serviceSouth = smoothRoad([
  { x: 1_205, y: 840 },
  { x: 1_275, y: 900 },
  { x: 1_335, y: 980 },
  { x: 1_375, y: 1_075 },
  { x: 1_385, y: 1_175 },
  { x: 1_355, y: 1_270 },
  { x: 1_300, y: 1_345 },
  { x: 1_220, y: 1_395 },
  { x: 1_135, y: 1_430 },
  { x: 1_095, y: 1_540 },
  { x: 1_035, y: 1_625 },
  { x: 1_020, y: 1_715 },
  { x: 1_080, y: 1_805 },
  { x: 1_115, y: 1_900 },
  { x: 1_095, y: 2_000 },
  { x: 1_035, y: 2_095 },
  { x: 985, y: 2_190 },
  { x: 980, y: 2_290 },
  { x: 1_020, y: 2_390 },
  { x: 1_050, y: 2_485 },
  { x: 1_025, y: 2_580 },
  { x: 995, y: 2_655 },
  { x: 1_020, y: 2_705 },
  { x: 1_065, y: 2_725 },
]);

const reverse = (points: Point[]) => [...points].reverse();

const villaClubTerraces = smoothRoad([
  { x: 750, y: 620 },
  { x: 820, y: 625 },
  { x: 885, y: 650 },
  { x: 935, y: 700 },
  { x: 965, y: 770 },
  { x: 955, y: 845 },
  { x: 915, y: 915 },
  { x: 865, y: 980 },
  { x: 825, y: 1_050 },
  { x: 815, y: 1_120 },
]);

const villaClubPromenade = smoothRoad([
  { x: 750, y: 620 },
  { x: 825, y: 640 },
  { x: 895, y: 685 },
  { x: 955, y: 750 },
  { x: 1_015, y: 815 },
  { x: 1_085, y: 860 },
  { x: 1_165, y: 900 },
  { x: 1_235, y: 960 },
  { x: 1_280, y: 1_040 },
  { x: 1_285, y: 1_120 },
  { x: 1_245, y: 1_180 },
]);

export const ROUTES: RouteDefinition[] = [
  {
    id: "pool-yacht-coast",
    label: "Küstenstraße",
    description: "Ruhiger, schöner, mehr Zeit mit Lola.",
    from: "pool",
    to: "yacht",
    durationMs: 8_000,
    tags: ["ruhig", "diskret"],
    advantage: "Heat −5 · Lola genießt die Aussicht",
    risk: "8 Sekunden · kein Tempobonus",
    effects: { fans: 70, heat: -5, mood: 4, attraction: 3 },
    points: coastSouth,
  },
  {
    id: "pool-yacht-service",
    label: "Serviceweg",
    description: "Direkter, ruppiger und deutlich auffälliger.",
    from: "pool",
    to: "yacht",
    durationMs: 5_500,
    tags: ["schnell", "auffällig"],
    advantage: "$ +300 · Fans +120 · nur 6 Sekunden",
    risk: "Heat +8 · Vertrauen −2",
    effects: { cash: 300, fans: 120, heat: 8, mood: 2, trust: -2 },
    points: serviceSouth,
  },
  {
    id: "yacht-pool-coast",
    label: "Küstenstraße",
    description: "Die lange Aussichtsrunde zurück zum Pool.",
    from: "yacht",
    to: "pool",
    durationMs: 8_000,
    tags: ["entspannt", "lang"],
    advantage: "Heat −4 · mehr Zeit mit Lola",
    risk: "Das Eis leidet · Vertrauen −2",
    effects: { fans: 60, heat: -4, mood: 5, attraction: 3, trust: -2 },
    points: reverse(coastSouth),
  },
  {
    id: "yacht-pool-service",
    label: "Serviceweg",
    description: "Schnell zurück, aber mit engem Zeitfenster.",
    from: "yacht",
    to: "pool",
    durationMs: 5_500,
    tags: ["schnell", "kontrolliert"],
    advantage: "Eis bleibt kalt · Vertrauen +5",
    risk: "Heat +8 · Kontrollen möglich",
    effects: { fans: 40, heat: 8, mood: 1, trust: 5 },
    points: reverse(serviceSouth),
  },
  {
    id: "villa-club-terraces",
    label: "Terrassenweg",
    description: "Weniger Kameras und genug Abstand zu den Partyvillen.",
    from: "villa",
    to: "club",
    durationMs: 7_000,
    tags: ["diskret", "ruhig"],
    advantage: "Heat −4 · Mias Diskretion",
    risk: "7 Sekunden · keine öffentliche Aufmerksamkeit",
    effects: { heat: -4, trust: 4, mood: 2 },
    points: villaClubTerraces,
  },
  {
    id: "villa-club-promenade",
    label: "VIP-Promenade",
    description: "Schnell zum Club, aber unter Kameras und neugierigen Blicken.",
    from: "villa",
    to: "club",
    durationMs: 5_200,
    tags: ["schnell", "öffentlich"],
    advantage: "Fans +160 · nur 5 Sekunden",
    risk: "Heat +7 · Mias Vertrauen −3",
    effects: { fans: 160, heat: 7, trust: -3, mood: -1 },
    points: villaClubPromenade,
  },
];

export function getRoute(id: string): RouteDefinition {
  const route = ROUTES.find((candidate) => candidate.id === id);
  if (!route) {
    throw new Error(`Unknown route: ${id}`);
  }
  return route;
}
