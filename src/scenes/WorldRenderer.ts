import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
  type Ticker,
} from "pixi.js";
import { ASSETS } from "../core/AssetManager";
import type { Point, RouteDefinition } from "../core/types";

const WORLD_WIDTH = 2_048;
const WORLD_HEIGHT = 3_072;

interface MapLabel {
  label: string;
  point: Point;
  color: number;
}

const LABELS: MapLabel[] = [
  { label: "VILLA", point: { x: 520, y: 520 }, color: 0x8bd64a },
  { label: "POOL", point: { x: 1_430, y: 690 }, color: 0x38c9ff },
  { label: "CLUB", point: { x: 1_025, y: 1_050 }, color: 0xff4f9a },
  { label: "BAR", point: { x: 650, y: 1_620 }, color: 0xffa43a },
  { label: "DOCK", point: { x: 1_425, y: 2_175 }, color: 0x38c9ff },
  { label: "YACHT-DOCK", point: { x: 1_065, y: 2_725 }, color: 0xff4f9a },
];

type WorldMode = "hub" | "route" | "travel";

function pathLength(points: Point[]): { lengths: number[]; total: number } {
  const lengths = [0];
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const current = points[index];
    const previous = points[index - 1];
    if (!current || !previous) {
      continue;
    }
    total += Math.hypot(current.x - previous.x, current.y - previous.y);
    lengths.push(total);
  }
  return { lengths, total };
}

function samplePath(points: Point[], progress: number): { point: Point; heading: number } {
  const { lengths, total } = pathLength(points);
  const distance = Math.min(1, Math.max(0, progress)) * total;
  let segment = 1;
  while (segment < lengths.length && (lengths[segment] ?? total) < distance) {
    segment += 1;
  }
  const start = points[Math.max(0, segment - 1)] ?? points[0] ?? { x: 0, y: 0 };
  const end = points[Math.min(points.length - 1, segment)] ?? start;
  const startDistance = lengths[Math.max(0, segment - 1)] ?? 0;
  const endDistance = lengths[Math.min(lengths.length - 1, segment)] ?? total;
  const local = endDistance === startDistance ? 0 : (distance - startDistance) / (endDistance - startDistance);
  return {
    point: {
      x: start.x + (end.x - start.x) * local,
      y: start.y + (end.y - start.y) * local,
    },
    heading: Math.atan2(end.y - start.y, end.x - start.x),
  };
}

export class WorldRenderer {
  private readonly app = new Application();
  private readonly world = new Container();
  private readonly routeLayer = new Container();
  private readonly pinLayer = new Container();
  private readonly vehicleLayer = new Container();
  private readonly resizeObserver: ResizeObserver;
  private mode: WorldMode = "hub";
  private car: Sprite | null = null;
  private carShadow: Graphics | null = null;
  private currentPoint: Point = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
  private tickerHandler: ((ticker: Ticker) => void) | null = null;
  private skipTravel: (() => void) | null = null;

  public constructor(private readonly host: HTMLElement) {
    this.resizeObserver = new ResizeObserver(() => this.layout());
  }

  public async init(mode: WorldMode, routes: RouteDefinition[] = []): Promise<void> {
    this.mode = mode;
    await this.app.init({
      resizeTo: this.host,
      backgroundColor: 0x02070d,
      backgroundAlpha: 1,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio, 2),
    });
    this.app.canvas.className = "world-canvas";
    this.app.canvas.setAttribute("aria-label", "Interaktive Inselkarte");
    this.host.append(this.app.canvas);
    this.app.stage.addChild(this.world);

    const [worldTexture, carTexture] = await Promise.all([
      Assets.load<Texture>(ASSETS.world),
      Assets.load<Texture>(ASSETS.car),
    ]);
    const map = new Sprite(worldTexture);
    map.width = WORLD_WIDTH;
    map.height = WORLD_HEIGHT;
    this.world.addChild(map, this.routeLayer, this.pinLayer, this.vehicleLayer);

    if (mode !== "travel") {
      this.addPins();
    }
    routes.forEach((route, index) => this.addRoute(route, index === 0 ? 0xff4f9a : 0x38c9ff));
    if (mode === "travel") {
      this.addVehicle(carTexture);
    }

    this.resizeObserver.observe(this.host);
    this.layout();
    this.host.dataset.ready = "true";
  }

  public playRoute(
    route: RouteDefinition,
    onProgress: (progress: number) => void,
    onDone: () => void,
  ): void {
    if (!this.car || !this.carShadow) {
      throw new Error("WorldRenderer must be initialized in travel mode.");
    }
    const started = performance.now();
    let finished = false;
    const finish = () => {
      if (finished) {
        return;
      }
      finished = true;
      if (this.tickerHandler) {
        this.app.ticker.remove(this.tickerHandler);
        this.tickerHandler = null;
      }
      onProgress(1);
      onDone();
    };
    this.skipTravel = finish;
    this.tickerHandler = () => {
      const linear = Math.min(1, (performance.now() - started) / route.durationMs);
      const eased = linear * linear * (3 - 2 * linear);
      const sample = samplePath(route.points, eased);
      this.currentPoint = sample.point;
      this.car?.position.set(sample.point.x, sample.point.y);
      this.carShadow?.position.set(sample.point.x + 14, sample.point.y + 24);
      if (this.car) {
        this.car.rotation = sample.heading + Math.PI / 2;
      }
      if (this.carShadow) {
        this.carShadow.rotation = sample.heading + Math.PI / 2;
      }
      this.layout();
      onProgress(linear);
      if (linear >= 1) {
        finish();
      }
    };
    this.app.ticker.add(this.tickerHandler);
  }

  public skip(): void {
    this.skipTravel?.();
  }

  public destroy(): void {
    this.resizeObserver.disconnect();
    if (this.tickerHandler) {
      this.app.ticker.remove(this.tickerHandler);
    }
    this.app.destroy(true);
  }

  private addRoute(route: RouteDefinition, color: number): void {
    const glow = new Graphics();
    const line = new Graphics();
    const first = route.points[0];
    if (!first) {
      return;
    }
    glow.moveTo(first.x, first.y);
    line.moveTo(first.x, first.y);
    for (const point of route.points.slice(1)) {
      glow.lineTo(point.x, point.y);
      line.lineTo(point.x, point.y);
    }
    glow.stroke({ width: 38, color, alpha: 0.18, cap: "round", join: "round" });
    line.stroke({ width: 13, color, alpha: 0.9, cap: "round", join: "round" });
    this.routeLayer.addChild(glow, line);
  }

  private addPins(): void {
    for (const item of LABELS) {
      const pin = new Container();
      pin.position.set(item.point.x, item.point.y);
      const stem = new Graphics()
        .moveTo(0, 34)
        .lineTo(-15, 10)
        .lineTo(15, 10)
        .closePath()
        .fill({ color: item.color, alpha: 0.95 });
      const circle = new Graphics()
        .circle(0, 0, 39)
        .fill({ color: 0x07121d, alpha: 0.94 })
        .stroke({ width: 6, color: item.color, alpha: 1 });
      const dot = new Graphics().circle(0, 0, 10).fill({ color: item.color });
      const label = new Text({
        text: item.label,
        style: {
          fontFamily: "Arial, sans-serif",
          fontSize: 27,
          fontWeight: "700",
          fill: 0xf7f7fb,
          stroke: { color: 0x02070d, width: 6 },
        },
      });
      label.anchor.set(0.5, 0);
      label.position.set(0, 51);
      pin.addChild(stem, circle, dot, label);
      this.pinLayer.addChild(pin);
    }
  }

  private addVehicle(texture: Texture): void {
    this.carShadow = new Graphics()
      .ellipse(0, 0, 52, 82)
      .fill({ color: 0x000000, alpha: 0.42 });
    this.carShadow.pivot.set(0, 0);
    this.car = new Sprite(texture);
    this.car.anchor.set(0.5);
    this.car.width = 128;
    this.car.height = 128;
    this.vehicleLayer.addChild(this.carShadow, this.car);
  }

  private layout(): void {
    const width = Math.max(1, this.app.screen.width);
    const height = Math.max(1, this.app.screen.height);
    if (this.mode === "travel") {
      const scale = Math.max(width / 760, height / 1_140);
      this.world.scale.set(scale);
      this.world.position.set(width / 2 - this.currentPoint.x * scale, height / 2 - this.currentPoint.y * scale);
      return;
    }
    const scale = Math.min(width / WORLD_WIDTH, height / WORLD_HEIGHT);
    this.world.scale.set(scale);
    this.world.position.set((width - WORLD_WIDTH * scale) / 2, (height - WORLD_HEIGHT * scale) / 2);
  }
}
