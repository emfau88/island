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
import { LOCATIONS } from "../data/locations";
import type {
  LocationId,
  Point,
  RouteDefinition,
} from "../core/types";

const WORLD_WIDTH = 2_048;
const WORLD_HEIGHT = 3_072;

type WorldMode = "hub" | "route" | "travel";

export interface WorldRendererOptions {
  onLocationSelect?: (locationId: LocationId) => void;
  highlightedLocationId?: LocationId;
  homeLabel?: string;
  discoveryLocationIds?: LocationId[];
}

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
  private static sharedApp: Application | null = null;
  private static sharedAppPromise: Promise<Application> | null = null;
  private app: Application | null = null;
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
  private routePaused = false;
  private pausedAt = 0;
  private totalPaused = 0;
  private landmarkButtons: HTMLButtonElement[] = [];
  private options: WorldRendererOptions = {};
  private destroyed = false;

  public constructor(private readonly host: HTMLElement) {
    this.resizeObserver = new ResizeObserver(() => this.layout());
  }

  public async init(
    mode: WorldMode,
    routes: RouteDefinition[] = [],
    options: WorldRendererOptions = {},
  ): Promise<void> {
    this.mode = mode;
    this.options = options;
    const [worldTexture, carTexture] = await Promise.all([
      Assets.load<Texture>(ASSETS.world),
      Assets.load<Texture>(ASSETS.car),
    ]);
    const app = await WorldRenderer.acquireApplication();
    if (this.destroyed) return;
    this.app = app;
    app.canvas.className = "world-canvas";
    app.canvas.setAttribute("aria-label", "Interaktive Inselkarte");
    this.host.append(app.canvas);
    app.stage.addChild(this.world);

    const map = new Sprite(worldTexture);
    map.width = WORLD_WIDTH;
    map.height = WORLD_HEIGHT;
    this.world.addChild(map);
    this.world.addChild(this.routeLayer, this.pinLayer, this.vehicleLayer);

    if (mode === "route") {
      this.addPins();
    }
    if (mode === "hub") {
      this.addLandmarkButtons();
    }
    routes.forEach((route, index) => this.addRoute(route, index === 0 ? 0xff4f9a : 0x38c9ff));
    if (mode === "travel") {
      this.addVehicle(carTexture);
    }

    this.resizeObserver.observe(this.host);
    this.layout();
    this.host.dataset.ready = "true";
    this.host.dataset.renderer = "shared";
  }

  public playRoute(
    route: RouteDefinition,
    onProgress: (progress: number) => void,
    onDone: () => void,
  ): void {
    const app = this.app;
    if (!this.car || !this.carShadow) {
      throw new Error("WorldRenderer must be initialized in travel mode.");
    }
    if (!app) {
      throw new Error("WorldRenderer has no active application.");
    }
    const started = performance.now();
    let finished = false;
    this.routePaused = false;
    this.pausedAt = 0;
    this.totalPaused = 0;
    const initial = samplePath(route.points, 0);
    this.currentPoint = initial.point;
    this.car.position.set(initial.point.x, initial.point.y);
    this.car.rotation = initial.heading + Math.PI / 2;
    this.carShadow.position.set(initial.point.x + 8, initial.point.y + 14);
    this.carShadow.rotation = initial.heading + Math.PI / 2;
    const finish = () => {
      if (finished) {
        return;
      }
      finished = true;
      if (this.tickerHandler) {
        app.ticker.remove(this.tickerHandler);
        this.tickerHandler = null;
      }
      this.routePaused = false;
      onProgress(1);
      onDone();
    };
    this.skipTravel = finish;
    this.tickerHandler = () => {
      if (this.routePaused) {
        return;
      }
      const linear = Math.min(1, (performance.now() - started - this.totalPaused) / route.durationMs);
      const eased = linear * linear * (3 - 2 * linear);
      const sample = samplePath(route.points, eased);
      this.currentPoint = sample.point;
      this.car?.position.set(sample.point.x, sample.point.y);
      this.carShadow?.position.set(sample.point.x + 8, sample.point.y + 14);
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
    app.ticker.add(this.tickerHandler);
  }

  public pause(): void {
    if (this.routePaused || !this.tickerHandler) return;
    this.routePaused = true;
    this.pausedAt = performance.now();
  }

  public resume(): void {
    if (!this.routePaused || !this.tickerHandler) return;
    this.totalPaused += performance.now() - this.pausedAt;
    this.pausedAt = 0;
    this.routePaused = false;
  }

  public skip(): void {
    this.skipTravel?.();
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.resizeObserver.disconnect();
    if (this.tickerHandler && this.app) {
      this.app.ticker.remove(this.tickerHandler);
    }
    for (const button of this.landmarkButtons) button.remove();
    this.landmarkButtons = [];
    this.world.removeFromParent();
    this.world.destroy({ children: true });
    if (this.app?.canvas.parentElement === this.host) {
      this.app.canvas.remove();
    }
    this.app = null;
  }

  private static async acquireApplication(): Promise<Application> {
    if (WorldRenderer.sharedApp) return WorldRenderer.sharedApp;
    if (!WorldRenderer.sharedAppPromise) {
      const app = new Application();
      WorldRenderer.sharedAppPromise = app
        .init({
          backgroundColor: 0x02070d,
          backgroundAlpha: 1,
          antialias: true,
          autoDensity: true,
          resolution: Math.min(window.devicePixelRatio, 2),
        })
        .then(() => {
          app.canvas.addEventListener("webglcontextlost", () => {
            app.canvas.dataset.contextLost = "true";
          });
          app.canvas.addEventListener("webglcontextrestored", () => {
            delete app.canvas.dataset.contextLost;
          });
          WorldRenderer.sharedApp = app;
          return app;
        });
    }
    return WorldRenderer.sharedAppPromise;
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
    for (const item of LOCATIONS) {
      const pin = new Container();
      pin.position.set(item.world.x, item.world.y);
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
        text: item.mapLabel,
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

  private addLandmarkButtons(): void {
    for (const location of LOCATIONS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "world-landmark";
      button.dataset.locationId = location.id;
      button.style.setProperty(
        "--landmark-color",
        `#${location.color.toString(16).padStart(6, "0")}`,
      );
      if (location.id === this.options.highlightedLocationId) {
        button.classList.add("is-objective");
      }
      if (location.kind === "home") {
        button.classList.add("is-home");
      }
      if (this.options.discoveryLocationIds?.includes(location.id)) {
        button.classList.add("has-discovery");
      }
      const icon = document.createElement("span");
      icon.className = "world-landmark__pin";
      const glyph = document.createElement("span");
      glyph.className = "world-landmark__glyph";
      glyph.textContent = location.icon;
      icon.append(glyph);
      const label = document.createElement("span");
      label.className = "world-landmark__label";
      label.textContent =
        location.kind === "home" && this.options.homeLabel
          ? this.options.homeLabel
          : location.mapLabel;
      button.append(icon, label);
      button.setAttribute(
        "aria-label",
        location.kind === "home"
          ? `Runner-Home auf Inselkarte öffnen: ${this.options.homeLabel ?? location.label}`
          : `${location.label} erkunden`,
      );
      button.addEventListener("click", () =>
        this.options.onLocationSelect?.(location.id),
      );
      this.host.append(button);
      this.landmarkButtons.push(button);
    }
  }

  private addVehicle(texture: Texture): void {
    this.carShadow = new Graphics()
      .ellipse(0, 0, 34, 54)
      .fill({ color: 0x000000, alpha: 0.42 });
    this.carShadow.pivot.set(0, 0);
    this.car = new Sprite(texture);
    this.car.anchor.set(0.5);
    this.car.width = 82;
    this.car.height = 82;
    this.vehicleLayer.addChild(this.carShadow, this.car);
  }

  private layout(): void {
    if (!this.app || this.destroyed) return;
    const bounds = this.host.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    this.app.renderer.resize(width, height);
    if (this.mode === "travel") {
      const scale = Math.max(width / 760, height / 1_140);
      this.world.scale.set(scale);
      this.world.position.set(width / 2 - this.currentPoint.x * scale, height / 2 - this.currentPoint.y * scale);
      return;
    }
    const scale = Math.min(width / WORLD_WIDTH, height / WORLD_HEIGHT);
    this.world.scale.set(scale);
    const offsetX = (width - WORLD_WIDTH * scale) / 2;
    const offsetY = (height - WORLD_HEIGHT * scale) / 2;
    this.world.position.set(offsetX, offsetY);
    for (const button of this.landmarkButtons) {
      const location = LOCATIONS.find(
        (candidate) => candidate.id === button.dataset.locationId,
      );
      if (!location) continue;
      button.style.left = `${offsetX + location.world.x * scale}px`;
      button.style.top = `${offsetY + location.world.y * scale}px`;
    }
  }
}
