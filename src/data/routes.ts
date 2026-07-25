import type { RouteDefinition } from "../core/types";

const coastSouth = [
  { x: 1_430, y: 690 },
  { x: 1_300, y: 830 },
  { x: 1_100, y: 960 },
  { x: 880, y: 1_110 },
  { x: 820, y: 1_300 },
  { x: 1_020, y: 1_470 },
  { x: 1_115, y: 1_660 },
  { x: 1_020, y: 1_890 },
  { x: 935, y: 2_120 },
  { x: 955, y: 2_350 },
  { x: 1_065, y: 2_725 },
];

const serviceSouth = [
  { x: 1_430, y: 690 },
  { x: 1_250, y: 860 },
  { x: 1_090, y: 1_060 },
  { x: 1_130, y: 1_310 },
  { x: 1_170, y: 1_570 },
  { x: 1_050, y: 1_840 },
  { x: 960, y: 2_150 },
  { x: 1_065, y: 2_725 },
];

const reverse = (points: { x: number; y: number }[]) => [...points].reverse();

export const ROUTES: RouteDefinition[] = [
  {
    id: "pool-yacht-coast",
    label: "Küstenstraße",
    description: "Ruhiger, schöner, mehr Zeit mit Lola.",
    from: "pool",
    to: "yacht",
    durationMs: 8_000,
    tags: ["safe", "scenic"],
    effects: { fans: 80, heat: -2, mood: 4, attraction: 2 },
    points: coastSouth,
  },
  {
    id: "pool-yacht-service",
    label: "Serviceweg",
    description: "Direkter, ruppiger und deutlich auffälliger.",
    from: "pool",
    to: "yacht",
    durationMs: 5_500,
    tags: ["fast", "risky"],
    effects: { fans: 25, heat: 5, mood: -2, trust: -1 },
    points: serviceSouth,
  },
  {
    id: "yacht-pool-coast",
    label: "Küstenstraße",
    description: "Die lange Aussichtsrunde zurück zum Pool.",
    from: "yacht",
    to: "pool",
    durationMs: 8_000,
    tags: ["safe", "scenic"],
    effects: { fans: 70, heat: -2, mood: 4, trust: 1 },
    points: reverse(coastSouth),
  },
  {
    id: "yacht-pool-service",
    label: "Serviceweg",
    description: "Schnell zurück, aber mit engem Zeitfenster.",
    from: "yacht",
    to: "pool",
    durationMs: 5_500,
    tags: ["fast", "risky"],
    effects: { fans: 20, heat: 5, mood: -1, attraction: 1 },
    points: reverse(serviceSouth),
  },
];

export function getRoute(id: string): RouteDefinition {
  const route = ROUTES.find((candidate) => candidate.id === id);
  if (!route) {
    throw new Error(`Unknown route: ${id}`);
  }
  return route;
}
