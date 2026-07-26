import { LOCATIONS, getLocation } from "../data/locations";
import { getCharacter, getCharacterPortrait } from "../data/characters";
import { getMessage } from "../data/messages";
import { getMission } from "../data/missions";
import { PROPERTY_TIERS, type PropertyTierDefinition } from "../data/property";
import { getRoute } from "../data/routes";
import { WorldRenderer } from "../scenes/WorldRenderer";
import { FeedbackSystem } from "../systems/FeedbackSystem";
import { MessageSystem } from "../systems/MessageSystem";
import { MissionSystem } from "../systems/MissionSystem";
import { PropertySystem } from "../systems/PropertySystem";
import { HomeSceneSystem } from "../systems/HomeSceneSystem";
import { ExplorationSystem } from "../systems/ExplorationSystem";
import { SecretWingSystem } from "../systems/SecretWingSystem";
import {
  getHeatTier,
  getRelationshipTier,
  relationshipScore,
} from "../systems/ProgressionSystem";
import { CharacterReactionController } from "../systems/ReactionSystem";
import { preloadReaction, reactionAsset, ASSETS } from "./AssetManager";
import { EventBus } from "./EventBus";
import { SaveManager } from "./SaveManager";
import { StateMachine } from "./StateMachine";
import {
  type Choice,
  type CharacterId,
  type Effects,
  type LocationId,
  type MessageDefinition,
  type MissionDefinition,
  type MissionResult,
  type PhoneTab,
  type SaveState,
  type SceneId,
} from "./types";

interface GameEvents {
  toast: string;
}

const SCENE_TRANSITIONS: Record<SceneId, readonly SceneId[]> = {
  hub: ["pickup"],
  pickup: ["route", "hub"],
  route: ["travel", "hub"],
  travel: ["encounter", "hub"],
  encounter: ["hub"],
};

const moneyFormatter = new Intl.NumberFormat("de-DE");

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function button(className: string, text: string, action: () => void): HTMLButtonElement {
  const element = el("button", className, text);
  element.type = "button";
  element.addEventListener("click", action);
  return element;
}

function metric(icon: string, label: string, value: string, tone: string): HTMLElement {
  const item = el("div", `hud-metric ${tone}`);
  item.setAttribute("aria-label", `${label}: ${value}`);
  item.title = label;
  item.append(el("span", "hud-metric__icon", icon), el("strong", "hud-metric__value", value));
  return item;
}

function reactionLine(choice: Choice, characterName: string): string {
  const lines = {
    neutral: `${characterName} wartet auf deine Entscheidung.`,
    positive: "„Okay. Du bist vorbereitet.“",
    flirty: "„Hm. Das könnte interessant werden.“",
    serious: "„Gute Frage. Merk dir die Antwort.“",
    annoyed: "„Das war nicht dein bester Moment.“",
    surprised: "„Damit habe ich jetzt nicht gerechnet.“",
  };
  return lines[choice.reaction];
}

function sceneForSave(state: SaveState): SceneId {
  return state.activeMission?.phase ?? "hub";
}

const EFFECT_LABELS: Record<keyof Effects, { icon: string; label: string }> = {
  cash: { icon: "$", label: "Cash" },
  fans: { icon: "★", label: "Fans" },
  heat: { icon: "!", label: "Heat" },
  attraction: { icon: "♥", label: "Anziehung" },
  trust: { icon: "◆", label: "Vertrauen" },
  mood: { icon: "☀", label: "Stimmung" },
};

function effectParts(effects: Partial<Effects>, exact: boolean): string[] {
  const parts: string[] = [];
  for (const key of Object.keys(EFFECT_LABELS) as Array<keyof Effects>) {
    const value = effects[key] ?? 0;
    if (value === 0) continue;
    const meta = EFFECT_LABELS[key];
    const direction = value > 0 ? "+" : "−";
    parts.push(
      exact
        ? `${meta.icon} ${meta.label} ${value > 0 ? "+" : ""}${value}`
        : `${meta.icon} ${meta.label} ${direction}`,
    );
  }
  return parts;
}

export class Game {
  private readonly saveManager = new SaveManager();
  private readonly missions = new MissionSystem();
  private readonly messages = new MessageSystem();
  private readonly property = new PropertySystem();
  private readonly homeScenes = new HomeSceneSystem();
  private readonly exploration = new ExplorationSystem();
  private readonly secretWing = new SecretWingSystem();
  private readonly feedback = new FeedbackSystem();
  private readonly events = new EventBus<GameEvents>();
  private state = this.saveManager.load();
  private machine = new StateMachine<SceneId>(sceneForSave(this.state), SCENE_TRANSITIONS);
  private phoneTab: PhoneTab = "messages";
  private selectedChatId: CharacterId | null = null;
  private selectedContactId: CharacterId = "lola";
  private phoneOverlay: HTMLElement | null = null;
  private world: WorldRenderer | null = null;
  private readonly shell = el("div", "app-shell");
  private readonly hud = el("header", "top-hud");
  private readonly stage = el("main", "game-stage");
  private readonly missionBar = el("footer", "mission-bar");
  private readonly toast = el("div", "toast");
  private toastTimer: number | null = null;

  public constructor(private readonly root: HTMLElement) {
    this.shell.append(this.hud, this.stage, this.missionBar, this.toast);
    this.root.replaceChildren(this.shell);
    this.events.on("toast", (message) => this.showToast(message));
    this.feedback.configure(this.state.settings);
  }

  public async start(): Promise<void> {
    await this.render();
  }

  private async render(): Promise<void> {
    this.phoneOverlay?.remove();
    this.phoneOverlay = null;
    this.world?.destroy();
    this.world = null;
    this.renderHud();
    this.renderMissionBar();
    this.stage.replaceChildren();
    this.shell.dataset.scene = this.machine.current;

    switch (this.machine.current) {
      case "hub":
        await this.renderHub();
        break;
      case "pickup":
        this.renderPickup();
        break;
      case "route":
        await this.renderRoute();
        break;
      case "travel":
        await this.renderTravel();
        break;
      case "encounter":
        this.renderEncounter();
        break;
    }
  }

  private renderHud(): void {
    this.hud.replaceChildren();
    const resources = el("div", "hud-resources");
    resources.append(
      metric("$", "Cash", moneyFormatter.format(this.state.resources.cash), "cash"),
      metric("★", "Fans", moneyFormatter.format(this.state.resources.fans), "fans"),
      metric("!", "Heat", `${this.state.resources.heat}%`, "heat"),
    );

    const actions = el("div", "hud-actions");
    const unread = this.state.messages.filter((message) => !message.read).length;
    const phone = button("icon-button phone-button", "▯", () => {
      this.feedback.tap();
      if (this.state.activeMission) {
        this.events.emit("toast", "Smartphone nach diesem Missionsschritt verfügbar.");
        return;
      }
      this.openPhone("messages");
    });
    phone.setAttribute("aria-label", `Smartphone öffnen${unread ? `, ${unread} ungelesen` : ""}`);
    if (!this.state.flags.includes("onboarding_complete")) {
      phone.classList.add("is-guided");
    }
    if (unread) phone.append(el("span", "badge", String(unread)));

    const menu = button("icon-button", "☰", () => {
      this.feedback.tap();
      this.openMenu();
    });
    menu.setAttribute("aria-label", "Menü öffnen");
    actions.append(phone, menu);
    this.hud.append(resources, actions);
  }

  private renderMissionBar(): void {
    this.missionBar.replaceChildren();
    this.missionBar.hidden = !this.state.activeMission;
    if (!this.state.activeMission) return;
    const mission = getMission(this.state.activeMission.missionId);
    const progress = ["pickup", "route", "travel", "encounter"].indexOf(this.state.activeMission.phase) + 1;
    const status = el("div", "mission-progress");
    status.append(el("span", "eyebrow", `AUFTRAG · ${progress}/4`), el("strong", undefined, mission.title));
    const abort = button("nav-abort", "Auftrag abbrechen", () => this.confirmAbort());
    this.missionBar.append(status, abort);
  }

  private async renderHub(): Promise<void> {
    const screen = el("section", "screen map-screen world-screen");
    screen.setAttribute("aria-labelledby", "hub-title");
    const worldHost = el("div", "world-host");
    const brand = el("div", "brand-lockup");
    const brandMain = el("h1", undefined, "wh0re");
    brandMain.id = "hub-title";
    brand.append(brandMain, el("span", undefined, "ISLAND"));
    screen.append(worldHost, brand);
    const exploreToggle = button("map-explore-toggle", "Orte erkunden", () => {
      this.feedback.tap();
      screen.classList.toggle("is-exploring");
      exploreToggle.textContent = screen.classList.contains("is-exploring")
        ? "Auftrag anzeigen"
        : "Orte erkunden";
    });
    screen.append(exploreToggle);
    if (this.state.completedMissions.length > 0) {
      screen.append(this.renderPropertyAccess());
    }

    const pending = this.pendingReplyMessage();
    const available = this.missions.available(this.state);
    const brief = el("article", "floating-panel hub-brief");

    if (pending) {
      const isIntro = pending.id === "lola-intro";
      brief.append(
        el("span", "eyebrow notification", isIntro ? "NEUE NACHRICHT" : "ANTWORT AUSSTEHEND"),
        el("h2", undefined, isIntro ? "Lola sucht einen Runner." : `${pending.sender} wartet auf dich.`),
        el(
          "p",
          undefined,
          isIntro
            ? "Öffne dein Smartphone, lies ihre Nachricht und entscheide, wie du antwortest."
            : pending.preview,
        ),
        button("primary-button phone-cta", "Smartphone öffnen", () => {
          this.feedback.message();
          this.openPhone("messages", pending.id);
        }),
      );
      if (isIntro) {
        const guide = el("div", "onboarding-guide");
        guide.append(
          el("span", "guide-step", "1"),
          el("div", undefined, undefined),
        );
        guide.lastElementChild?.append(
          el("strong", undefined, "Neue Nachricht"),
          el("span", undefined, "Tippe oben rechts auf dein Smartphone und antworte Lola."),
        );
        screen.append(guide);
      }
    } else if (available[0]) {
      const mission = available[0];
      const location = getLocation(mission.startLocation);
      const character = getCharacter(mission.characterId);
      brief.append(
        el("span", "eyebrow", "TREFFPUNKT MARKIERT"),
        el("h2", undefined, mission.title),
        el("p", undefined, mission.summary),
        el("div", "objective-location", `● ${location.label}`),
        this.rewardRow(mission),
        button(
          "primary-button",
          `${character.name} am ${location.label} treffen`,
          () => this.startMission(mission.id),
        ),
      );
      brief.dataset.testid = `hub-${mission.id}`;
    } else if (this.homeScenes.isPending(this.state)) {
      const hasBungalow = this.property.current(this.state).level >= 1;
      brief.append(
        el("span", "eyebrow notification", hasBungalow ? "BESUCH ANGEKÜNDIGT" : "BUNGALOW BENÖTIGT"),
        el("h2", undefined, hasBungalow ? "Mia ist unterwegs." : "Mia braucht einen ruhigen Ort."),
        el(
          "p",
          undefined,
          hasBungalow
            ? "Öffne dein Anwesen. Die nächste Szene findet nicht auf dem Smartphone statt."
            : "Baue deine Strandhütte zum Runner-Bungalow aus, damit Mias Besuch stattfinden kann.",
        ),
        button("primary-button", hasBungalow ? "Mia im Anwesen treffen" : "Anwesen ausbauen", () =>
          this.openProperty(),
        ),
      );
    } else if (this.state.flags.includes("mia_home_visit_complete")) {
      const tier = getRelationshipTier(this.state.relationships.mia);
      brief.append(
        el("span", "eyebrow success", "MIA-SLICE ABGESCHLOSSEN"),
        el("h2", undefined, "Die Insel wird persönlich."),
        el(
          "p",
          undefined,
          `Mia-Status: ${tier.label}. Eure Entscheidungen sind jetzt auch zwischen den Figuren gespeichert.`,
        ),
        button("primary-button", "Soziales Gedächtnis ansehen", () => {
          this.selectedContactId = "mia";
          this.openPhone("contacts");
        }),
      );
    } else if (this.state.completedMissions.length >= 3) {
      const tier = getRelationshipTier(this.state.relationships.lola);
      brief.append(
        el("span", "eyebrow success", "LOLA-SLICE ABGESCHLOSSEN"),
        el("h2", undefined, "Du bist jetzt Insider."),
        el("p", undefined, `Runner-Status: ${tier.label}. ${this.endingSummary()}`),
        button("primary-button", "Smartphone öffnen", () => this.openPhone("contacts")),
      );
    } else {
      brief.append(
        el("span", "eyebrow", "WARTE AUF KONTAKT"),
        el("h2", undefined, "Die Insel schläft nie."),
        el("p", undefined, "Prüfe dein Smartphone auf neue Nachrichten und Aufträge."),
        button("primary-button", "Smartphone öffnen", () => this.openPhone("messages")),
      );
    }

    screen.append(brief);
    this.stage.append(screen);
    this.world = new WorldRenderer(worldHost);
    const objective = available[0]?.startLocation;
    const discoveryLocations = LOCATIONS.filter((location) =>
      this.exploration
        .activities(this.state, location.id)
        .some(({ status }) => status.unlocked),
    ).map((location) => location.id);
    await this.world.init("hub", [], {
      highlightedLocationId: objective,
      homeLabel: this.property.current(this.state).label,
      discoveryLocationIds: discoveryLocations,
      onLocationSelect: (locationId) => {
        this.feedback.tap();
        if (locationId === "runner-home") {
          this.openHomeHub();
        } else {
          this.openLocation(locationId);
        }
      },
    });
  }

  private openPhone(tab: PhoneTab = this.phoneTab, messageId?: string): void {
    if (this.state.activeMission) {
      this.events.emit("toast", "Smartphone nach diesem Missionsschritt verfügbar.");
      return;
    }
    this.phoneTab = tab;
    if (messageId !== undefined) {
      this.selectedChatId = getMessage(messageId).characterId;
    }
    this.renderPhoneOverlay();
  }

  private renderPropertyAccess(): HTMLButtonElement {
    const current = this.property.current(this.state);
    const next = this.property.next(this.state);
    const canBuild = next ? this.property.requirements(this.state, next).canBuild : false;
    const firstVisit = !this.state.property.tutorialSeen;
    const visitPending = this.homeScenes.isPending(this.state);
    const canHostVisit = visitPending && current.level >= 1;
    const access = button(
      `property-access${firstVisit || canBuild || visitPending ? " is-guided" : ""}`,
      "",
      () => {
        this.feedback.tap();
        this.openProperty();
      },
    );
    access.setAttribute("aria-label", `Zuhause öffnen: ${current.label}`);
    const copy = el("span", "property-access__copy");
    copy.append(
      el(
        "small",
        undefined,
        canHostVisit
          ? "MIA WARTET"
          : visitPending
            ? "BUNGALOW BENÖTIGT"
            : firstVisit
              ? "NEU · DEIN ZUHAUSE"
              : canBuild
                ? "AUSBAU MÖGLICH"
                : "DEIN ZUHAUSE",
      ),
      el("strong", undefined, current.label),
    );
    access.append(el("span", "property-access__icon", "⌂"), copy, el("span", "property-access__arrow", "›"));
    return access;
  }

  private openLocation(locationId: Exclude<LocationId, "runner-home">): void {
    if (this.state.activeMission) {
      this.events.emit("toast", "Orte kannst du zwischen den Aufträgen erkunden.");
      return;
    }

    const location = getLocation(locationId);
    const visitedState = this.exploration.visit(this.state, locationId);
    if (visitedState !== this.state) {
      this.state = visitedState;
      this.persist();
    }

    this.shell.querySelector(".world-overlay")?.remove();
    const overlay = el("div", "world-overlay location-overlay");
    const screen = el("section", "local-location-screen");
    screen.setAttribute("role", "dialog");
    screen.setAttribute("aria-modal", "true");
    screen.setAttribute("aria-labelledby", "local-location-title");

    const background = el("img", "local-location-background");
    background.src = location.asset;
    background.alt = `Nächtliche Ansicht: ${location.label}`;
    const shade = el("div", "local-location-shade");
    const header = el("header", "local-location-header");
    const close = button("location-back", "‹ Inselkarte", () => {
      overlay.remove();
      void this.render();
    });
    const headerCopy = el("div");
    headerCopy.append(
      el("span", "eyebrow", "INSELORT"),
      el("strong", undefined, location.mapLabel),
    );
    header.append(close, headerCopy);

    const panel = el("article", "local-location-panel");
    const title = el("h1", undefined, location.label);
    title.id = "local-location-title";
    panel.append(
      el("span", "eyebrow", "FREI ERKUNDEN"),
      title,
      el("p", "local-location-description", location.description),
    );

    const mission = this.missions
      .available(this.state)
      .find((candidate) => candidate.startLocation === locationId);
    if (mission) {
      const character = getCharacter(mission.characterId);
      const missionCard = el("section", "local-mission-card");
      const portrait = el("img", "local-mission-card__portrait");
      portrait.src = getCharacterPortrait(mission.characterId);
      portrait.alt = character.name;
      const missionCopy = el("div", "local-mission-card__copy");
      missionCopy.append(
        el("span", "eyebrow notification", "TREFFPUNKT"),
        el("strong", undefined, mission.title),
        el("p", undefined, mission.summary),
        button("primary-button", `${character.name} treffen`, () => {
          overlay.remove();
          this.startMission(mission.id);
        }),
      );
      missionCard.append(portrait, missionCopy);
      panel.append(missionCard);
    }

    const activities = this.exploration.activities(this.state, locationId);
    const activitySection = el("section", "location-activities");
    activitySection.append(el("h2", undefined, "Hier vor Ort"));
    for (const { definition, status } of activities) {
      const card = el(
        "article",
        `location-activity${status.completed ? " is-complete" : ""}`,
      );
      const activityCopy = el("div");
      activityCopy.append(
        el("strong", undefined, definition.title),
        el("p", undefined, definition.description),
      );
      const activityButton = button(
        status.completed ? "activity-status" : "secondary-button",
        status.completed
          ? "✓ Erledigt"
          : status.unlocked
            ? definition.actionLabel
            : status.reason ?? "Noch gesperrt",
        () => {
          try {
            this.feedback.choice();
            const result = this.exploration.resolve(this.state, definition.id);
            this.state = result.state;
            this.persist();
            this.renderHud();
            this.events.emit("toast", definition.resultText);
            overlay.remove();
            this.openLocation(locationId);
          } catch (error) {
            this.events.emit(
              "toast",
              error instanceof Error ? error.message : "Diese Aktion ist gerade nicht möglich.",
            );
          }
        },
      );
      activityButton.disabled = !status.unlocked;
      const effects = el("div", "location-activity__effects");
      const parts = effectParts(definition.effects, true);
      if (definition.discoveryId) parts.unshift("⌕ Neuer Hinweis");
      for (const part of parts) effects.append(el("span", undefined, part));
      card.append(activityCopy);
      if (parts.length) card.append(effects);
      card.append(activityButton);
      activitySection.append(card);
    }
    if (!activities.length) {
      activitySection.append(
        el("p", "empty-state", "Hier gibt es im Moment nichts Neues zu entdecken."),
      );
    }
    panel.append(activitySection);

    const locationDiscoveries = this.state.exploration.discoveries.length;
    const footer = el("footer", "location-progress-note");
    footer.append(
      el("span", undefined, `⌕ ${locationDiscoveries} Inselhinweise`),
      el(
        "span",
        undefined,
        `${this.state.exploration.visitedLocations.length}/${LOCATIONS.length} Orte besucht`,
      ),
    );
    panel.append(footer);

    screen.append(background, shade, header, panel);
    overlay.append(screen);
    this.shell.append(overlay);
    close.focus();
  }

  private openHomeHub(): void {
    if (this.state.activeMission) {
      this.events.emit("toast", "Dein Zuhause ist zwischen den Aufträgen verfügbar.");
      return;
    }

    const visitedState = this.exploration.visit(this.state, "runner-home");
    if (visitedState !== this.state) {
      this.state = visitedState;
      this.persist();
    }
    this.shell.querySelector(".world-overlay")?.remove();

    const current = this.property.current(this.state);
    const next = this.property.next(this.state);
    const overlay = el("div", "world-overlay home-hub-overlay");
    const screen = el("section", "home-hub-screen");
    screen.dataset.tier = current.id;
    screen.setAttribute("role", "dialog");
    screen.setAttribute("aria-modal", "true");
    screen.setAttribute("aria-labelledby", "home-hub-title");

    const visual = el("div", "home-hub-visual property-visual");
    visual.style.backgroundImage = `url("${ASSETS.property}")`;
    const header = el("header", "local-location-header home-hub-header");
    const close = button("location-back", "‹ Inselkarte", () => {
      overlay.remove();
      void this.render();
    });
    const headerCopy = el("div");
    headerCopy.append(
      el("span", "eyebrow", "DEIN ORT AUF DER INSEL"),
      el("strong", undefined, "RUNNER-HOME"),
    );
    header.append(close, headerCopy);

    const panel = el("article", "home-hub-panel");
    const title = el("h1", undefined, current.label);
    title.id = "home-hub-title";
    panel.append(
      el("span", "eyebrow success", current.kicker),
      title,
      el("p", "local-location-description", current.description),
    );

    const hubGrid = el("div", "home-hub-grid");
    const propertyCard = el("section", "home-hub-card is-property");
    propertyCard.append(
      el("span", "home-hub-card__icon", "⌂"),
      el("strong", undefined, next ? "Anwesen & Ausbau" : "Deine Villa"),
      el(
        "p",
        undefined,
        next
          ? `Nächste Stufe: ${next.label}. Baue mit Missionsgeld sichtbar weiter.`
          : "Die maximale Ausbaustufe ist erreicht.",
      ),
      button("secondary-button", next ? "Ausbau verwalten" : "Anwesen ansehen", () => {
        overlay.remove();
        this.openProperty();
      }),
    );

    const wing = this.secretWing.current(this.state);
    const wingCard = el("section", "home-hub-card is-secret");
    wingCard.append(
      el("span", "home-hub-card__icon", "◇"),
      el("strong", undefined, wing.level ? wing.label : "Versiegelter Zugang"),
      el(
        "p",
        undefined,
        wing.level
          ? `${this.secretWing.stayingGuests(this.state).length}/${wing.capacity} Gästesuiten belegt.`
          : this.state.exploration.discoveries.includes("hidden_foundation_plan")
            ? "Der alte Fundamentplan zeigt einen verborgenen Raum unter dem Haus."
            : "Vielleicht verraten alte Baupläne, was unter deinem Anwesen liegt.",
      ),
      button(
        "secondary-button",
        wing.level ? "Midnight Wing betreten" : "Geheimen Bereich prüfen",
        () => {
          overlay.remove();
          this.openSecretWing();
        },
      ),
    );
    hubGrid.append(propertyCard, wingCard);
    panel.append(hubGrid);

    if (this.homeScenes.isPending(this.state)) {
      const canMeet = current.level >= 1;
      const visit = el("section", "home-visit-card");
      visit.append(
        el("span", "eyebrow notification", canMeet ? "BESUCH ANGEKÜNDIGT" : "NOCH NICHT BEREIT"),
        el("strong", undefined, canMeet ? "Mia wartet auf ein privates Gespräch." : "Mia braucht mindestens den Runner-Bungalow."),
        el(
          "p",
          undefined,
          canMeet
            ? "Der Besuch findet hier in der Welt statt – nicht im Smartphone."
            : "Öffne den Ausbau und schaffe zuerst einen ruhigen Rückzugsort.",
        ),
        button("primary-button", canMeet ? "Mia hereinbitten" : "Anwesen ausbauen", () => {
          if (!canMeet) {
            overlay.remove();
            this.openProperty();
            return;
          }
          void preloadReaction("neutral", "mia")
            .catch(() => undefined)
            .then(() => this.showMiaHomeVisit(overlay));
        }),
      );
      panel.append(visit);
    }

    const memories = [...this.state.social.memories].reverse().slice(0, 3);
    const memorySection = el("section", "home-memory-wall");
    memorySection.append(el("span", "eyebrow", "SOZIALES GEDÄCHTNIS"), el("h2", undefined, "Was im Haus bleibt"));
    if (memories.length) {
      for (const memory of memories) {
        const item = el("article", `home-memory is-${memory.tone}`);
        item.append(
          el("strong", undefined, memory.title),
          el("p", undefined, memory.description),
          el(
            "small",
            undefined,
            `Bekannt: ${memory.knownBy.map((id) => getCharacter(id).name).join(", ")}`,
          ),
        );
        memorySection.append(item);
      }
    } else {
      memorySection.append(
        el("p", "empty-state", "Noch ist das Haus nur ein Ort. Entscheidungen machen es zur gemeinsamen Geschichte."),
      );
    }
    panel.append(memorySection);

    screen.append(visual, header, panel);
    overlay.append(screen);
    this.shell.append(overlay);
    close.focus();
  }

  private openSecretWing(): void {
    if (this.state.activeMission) {
      this.events.emit("toast", "Der Midnight Wing ist zwischen den Aufträgen verfügbar.");
      return;
    }

    this.shell.querySelector(".world-overlay")?.remove();
    const current = this.secretWing.current(this.state);
    const next = this.secretWing.next(this.state);
    const overlay = el("div", "world-overlay secret-wing-overlay");
    const screen = el("section", "secret-wing-screen");
    screen.dataset.level = String(current.level);
    screen.setAttribute("role", "dialog");
    screen.setAttribute("aria-modal", "true");
    screen.setAttribute("aria-labelledby", "secret-wing-title");

    const background = el("img", "secret-wing-background");
    background.src = ASSETS.midnightWing;
    background.alt = "Unterirdische Lounge unter dem Runner-Home";
    const shade = el("div", "secret-wing-shade");
    const header = el("header", "local-location-header secret-wing-header");
    const back = button("location-back", "‹ Runner-Home", () => {
      overlay.remove();
      this.openHomeHub();
    });
    const headerCopy = el("div");
    headerCopy.append(el("span", "eyebrow", "UNTER DEM ANWESEN"), el("strong", undefined, "MIDNIGHT WING"));
    header.append(back, headerCopy);

    const panel = el("article", "secret-wing-panel");
    const title = el("h1", undefined, current.label);
    title.id = "secret-wing-title";
    panel.append(
      el("span", "eyebrow", current.kicker),
      title,
      el("p", "local-location-description", current.description),
    );

    if (next) {
      const status = this.secretWing.requirements(this.state, next);
      const buildCard = el("section", "secret-wing-build");
      const buildHead = el("div", "secret-wing-build__head");
      const buildCopy = el("div");
      buildCopy.append(el("span", "eyebrow", "NÄCHSTE STUFE"), el("h2", undefined, next.label));
      buildHead.append(buildCopy, el("strong", undefined, `$ ${moneyFormatter.format(next.cost)}`));
      buildCard.append(buildHead, el("p", undefined, next.description));
      const requirements = el("div", "property-requirements");
      requirements.append(
        this.propertyRequirement(status.hasDiscovery, "Fundamentplan"),
        this.propertyRequirement(status.enoughProperty, this.propertyLabelFor(next.requiredProperty)),
        this.propertyRequirement(status.enoughMissions, `${next.requiredMissions} Aufträge`),
        this.propertyRequirement(status.enoughCash, "Budget"),
      );
      buildCard.append(requirements);
      const build = button(
        "primary-button",
        status.canBuild
          ? `${next.label} ausbauen`
          : !status.hasDiscovery
            ? "Fundamentplan in der Villa finden"
            : "Voraussetzungen fehlen",
        () => {
          try {
            this.feedback.choice();
            this.state = this.secretWing.purchase(this.state, next.level);
            this.persist();
            this.renderHud();
            this.events.emit("toast", `${next.label} ist jetzt zugänglich.`);
            overlay.remove();
            this.openSecretWing();
          } catch (error) {
            this.events.emit(
              "toast",
              error instanceof Error ? error.message : "Der Ausbau ist noch nicht möglich.",
            );
          }
        },
      );
      build.disabled = !status.canBuild;
      buildCard.append(build);
      if (!status.hasDiscovery) {
        buildCard.append(
          button("text-button", "Zur Oberen Villa", () => {
            overlay.remove();
            this.openLocation("villa");
          }),
        );
      }
      panel.append(buildCard);
    }

    if (current.level >= 1) {
      const guestSection = el("section", "secret-guests");
      guestSection.append(
        el("span", "eyebrow", "VERTRAULICHE AUFENTHALTE"),
        el("h2", undefined, `${this.secretWing.stayingGuests(this.state).length}/${current.capacity} Suiten belegt`),
      );
      for (const characterId of ["lola", "mia"] as CharacterId[]) {
        const character = getCharacter(characterId);
        const stay = this.state.secretWing.guests[characterId];
        const inviteStatus = this.secretWing.invitationStatus(this.state, characterId);
        const guestCard = el("article", `secret-guest-card is-${stay.status}`);
        const portrait = el("img", "secret-guest-card__portrait");
        portrait.src = getCharacterPortrait(characterId);
        portrait.alt = character.name;
        const guestCopy = el("div", "secret-guest-card__copy");
        guestCopy.append(
          el("span", "eyebrow", stay.status === "staying" ? "AKTUELL ZU GAST" : "KONTAKT"),
          el("strong", undefined, character.name),
          el(
            "p",
            undefined,
            stay.status === "staying"
              ? "Ein vertraulicher Aufenthalt im verborgenen Bereich hat begonnen."
              : `Vertrauen ${this.state.relationships[characterId].trust}% · benötigt ${inviteStatus.requiredTrust}%.`,
          ),
        );

        if (stay.status === "staying") {
          const actions = el("div", "secret-guest-actions");
          for (const scene of [
            { id: "boundaries" as const, label: "Grenzen besprechen" },
            { id: "confide" as const, label: "Vertraulich reden" },
          ]) {
            const completed = stay.completedScenes.includes(`${characterId}_${scene.id}`);
            const sceneButton = button(
              completed ? "activity-status" : "secondary-button",
              completed ? `✓ ${scene.label}` : scene.label,
              () => {
                try {
                  this.state = this.secretWing.resolveGuestScene(this.state, characterId, scene.id);
                  this.persist();
                  this.renderHud();
                  this.events.emit("toast", this.state.lastDecision ?? "Gespräch gespeichert.");
                  overlay.remove();
                  this.openSecretWing();
                } catch (error) {
                  this.events.emit("toast", error instanceof Error ? error.message : "Gespräch nicht verfügbar.");
                }
              },
            );
            sceneButton.disabled = completed;
            actions.append(sceneButton);
          }
          actions.append(
            button("text-button", "Aufenthalt abschließen", () => {
              this.state = this.secretWing.endStay(this.state, characterId);
              this.persist();
              this.events.emit("toast", `${character.name}s Aufenthalt ist abgeschlossen.`);
              overlay.remove();
              this.openSecretWing();
            }),
          );
          guestCopy.append(actions);
        } else {
          const invite = button(
            "secondary-button",
            inviteStatus.canInvite ? "Privat einladen" : inviteStatus.reason ?? "Nicht verfügbar",
            () => {
              try {
                this.feedback.message();
                this.state = this.secretWing.invite(this.state, characterId);
                this.persist();
                this.renderHud();
                this.events.emit("toast", `${character.name} hat die Einladung angenommen.`);
                overlay.remove();
                this.openSecretWing();
              } catch (error) {
                this.events.emit("toast", error instanceof Error ? error.message : "Einladung nicht möglich.");
              }
            },
          );
          invite.disabled = !inviteStatus.canInvite;
          guestCopy.append(invite);
        }
        guestCard.append(portrait, guestCopy);
        guestSection.append(guestCard);
      }
      panel.append(guestSection);
    }

    screen.append(background, shade, header, panel);
    overlay.append(screen);
    this.shell.append(overlay);
    back.focus();
  }

  private propertyLabelFor(tierId: SaveState["property"]["tier"]): string {
    return PROPERTY_TIERS.find((tier) => tier.id === tierId)?.label ?? tierId;
  }

  private openProperty(): void {
    if (this.state.activeMission) {
      this.events.emit("toast", "Dein Anwesen ist zwischen den Aufträgen verfügbar.");
      return;
    }
    this.shell.querySelector(".property-overlay")?.remove();
    const firstVisit = !this.state.property.tutorialSeen;
    if (firstVisit) {
      this.state = {
        ...this.state,
        property: {
          ...this.state.property,
          tutorialSeen: true,
        },
      };
      this.persist();
    }

    const current = this.property.current(this.state);
    const next = this.property.next(this.state);
    const overlay = el("div", "property-overlay");
    const screen = el("section", "property-screen");
    screen.dataset.tier = current.id;
    screen.setAttribute("role", "dialog");
    screen.setAttribute("aria-modal", "true");
    screen.setAttribute("aria-labelledby", "property-title");

    const visual = el("div", "property-visual");
    visual.style.backgroundImage = `url("${ASSETS.property}")`;
    const header = el("header", "property-header");
    const headerCopy = el("div");
    headerCopy.append(el("span", "eyebrow", "PRIVATE CLIFF"), el("strong", undefined, "DEIN ANWESEN"));
    const close = button("property-close", "×", () => {
      overlay.remove();
      void this.render();
    });
    close.setAttribute("aria-label", "Anwesen schließen");
    header.append(headerCopy, close);

    const progress = el("div", "property-progress");
    progress.setAttribute("aria-label", "Ausbaustufen");
    for (const tier of PROPERTY_TIERS) {
      const stateClass =
        tier.level < current.level ? " is-complete" : tier.level === current.level ? " is-current" : "";
      const step = el("div", `property-step${stateClass}`);
      step.title = tier.label;
      step.append(el("span", undefined, String(tier.level + 1)), el("small", undefined, tier.label));
      progress.append(step);
    }

    const panel = el("article", "property-panel");
    if (firstVisit) {
      const intro = el("div", "property-intro");
      intro.append(
        el("span", "eyebrow", "NEUER FORTSCHRITTSWEG"),
        el(
          "p",
          undefined,
          "Investiere Missionsgeld in einen sichtbaren Ort. Ausbauten schaffen neue Einladungen und Eindruck – Vertrauen bleibt eine Frage deiner Entscheidungen.",
        ),
      );
      panel.append(intro);
    }

    const title = el("h1", undefined, current.label);
    title.id = "property-title";
    const currentHead = el("div", "property-current__head");
    const currentCopy = el("div");
    currentCopy.append(el("span", "eyebrow", current.kicker), title);
    const impression = el("span", "property-impression", current.impression);
    currentHead.append(currentCopy, impression);
    panel.append(currentHead, el("p", "property-description", current.description));

    const perks = el("ul", "property-perks");
    for (const perk of current.perks) perks.append(el("li", undefined, perk));
    panel.append(perks);

    if (next) {
      const status = this.property.requirements(this.state, next);
      const upgrade = el("section", "property-upgrade");
      const upgradeHead = el("div", "property-upgrade__head");
      const upgradeCopy = el("div");
      upgradeCopy.append(el("span", "eyebrow", "NÄCHSTE STUFE"), el("h2", undefined, next.label));
      upgradeHead.append(
        upgradeCopy,
        el("strong", "property-price", `$ ${moneyFormatter.format(next.cost)}`),
      );
      upgrade.append(upgradeHead, el("p", undefined, next.description));

      const requirements = el("div", "property-requirements");
      requirements.append(
        this.propertyRequirement(
          status.enoughMissions,
          `${next.requiredMissions} Aufträge`,
        ),
        this.propertyRequirement(status.enoughFans, `${moneyFormatter.format(next.requiredFans)} Fans`),
        this.propertyRequirement(status.enoughCash, "Budget"),
      );
      upgrade.append(requirements);

      const effects = el("div", "property-effects");
      effects.append(el("span", undefined, `Eindruck: ${next.impression}`));
      for (const part of effectParts(next.effects, true)) effects.append(el("span", undefined, part));
      upgrade.append(effects);

      const build = button(
        "primary-button property-build",
        status.canBuild
          ? `${next.label} für $ ${moneyFormatter.format(next.cost)} bauen`
          : !status.enoughCash
            ? `$ ${moneyFormatter.format(next.cost - this.state.resources.cash)} fehlen`
            : "Noch nicht freigeschaltet",
        async () => {
          try {
            this.feedback.choice();
            build.disabled = true;
            build.textContent = "Ausbau läuft …";
            this.state = this.property.purchase(this.state, next.id);
            this.persist();
            this.renderHud();
            await preloadReaction(next.reaction).catch(() => undefined);
            this.showPropertyVignette(overlay, next);
          } catch (error) {
            build.disabled = false;
            this.events.emit(
              "toast",
              error instanceof Error ? error.message : "Der Ausbau konnte nicht gestartet werden.",
            );
          }
        },
      );
      build.disabled = !status.canBuild;
      upgrade.append(build);
      panel.append(upgrade);
    } else {
      const complete = el("div", "property-complete");
      complete.append(
        el("span", "eyebrow success", "MAXIMALE STUFE"),
        el("strong", undefined, "Die Villa gehört dir."),
        el("p", undefined, "Künftiges Geld fließt in Fahrzeuge, Events und besondere Vorbereitungen."),
      );
      panel.append(complete);
    }

    screen.append(visual, header, progress, panel);
    overlay.append(screen);
    this.shell.append(overlay);
    close.focus();
    if (this.homeScenes.isPending(this.state) && current.level >= 1) {
      void preloadReaction("neutral", "mia")
        .catch(() => undefined)
        .then(() => this.showMiaHomeVisit(overlay));
    }
  }

  private propertyRequirement(fulfilled: boolean, label: string): HTMLElement {
    const item = el("span", `property-requirement${fulfilled ? " is-met" : ""}`);
    item.append(el("strong", undefined, fulfilled ? "✓" : "×"), document.createTextNode(label));
    return item;
  }

  private showPropertyVignette(
    propertyOverlay: HTMLElement,
    tier: PropertyTierDefinition,
  ): void {
    const vignette = el("div", "property-vignette");
    vignette.dataset.reaction = tier.reaction;
    const character = el("img", "property-vignette__character");
    character.src = reactionAsset(tier.reaction);
    character.alt = `Lola reagiert ${tier.reaction}`;
    const content = el("article", "property-vignette__content");
    content.append(
      el("span", "eyebrow success", "AUSBAU ABGESCHLOSSEN"),
      el("h2", undefined, tier.label),
      el("span", "speaker", "LOLA"),
      el("p", "dialog-line", `„${tier.lolaLine}“`),
    );
    const effects = el("div", "effect-feedback");
    for (const part of effectParts(tier.effects, true)) effects.append(el("span", undefined, part));
    content.append(
      effects,
      el(
        "p",
        "property-trust-note",
        "Das Anwesen macht Eindruck. Vertrauen verdienst du weiterhin auf deinen Fahrten.",
      ),
      button("primary-button", "Neues Anwesen ansehen", () => {
        propertyOverlay.remove();
        this.openProperty();
      }),
    );
    vignette.append(character, content);
    propertyOverlay.append(vignette);
    content.querySelector<HTMLButtonElement>("button")?.focus();
  }

  private showMiaHomeVisit(propertyOverlay: HTMLElement): void {
    if (!propertyOverlay.isConnected || !this.homeScenes.isPending(this.state)) return;
    const vignette = el("div", "property-vignette home-visit-vignette");
    const character = el("img", "property-vignette__character");
    character.src = reactionAsset("neutral", "mia");
    character.alt = "Mia im Bungalow";
    const controller = new CharacterReactionController(character, "mia");
    const content = el("article", "property-vignette__content");
    const intro = this.state.flags.includes("mia_home_invite_private")
      ? "„Du hast allein gesagt. Ich hoffe, das war ernst gemeint.“"
      : this.state.flags.includes("mia_home_invite_open")
        ? "„Lola kommt später. Bis dahin reden wir ohne Publikum.“"
        : "„Ein ruhiger Ort. Gut. Dann können wir offen über die Sache reden.“";
    content.append(
      el("span", "eyebrow notification", "PRIVATER BESUCH"),
      el("h2", undefined, "Mia im Runner-Bungalow"),
      el("span", "speaker", "MIA"),
      el("p", "dialog-line", intro),
      el(
        "p",
        "property-trust-note",
        "Diese Entscheidung wird als soziale Erinnerung gespeichert – und nicht automatisch von Lola gewusst.",
      ),
    );
    const choices = this.choiceList(this.homeScenes.choices(), async (choice, clicked) => {
      this.disableChoiceList(clicked);
      this.feedback.choice();
      this.state = this.homeScenes.resolve(this.state, choice.id);
      this.persist();
      this.renderHud();
      this.showChoiceFeedback(content, choice.effects);
      const line = content.querySelector<HTMLElement>(".dialog-line");
      if (line) line.textContent = reactionLine(choice, "Mia");
      await controller.setCharacterReaction(choice.reaction);
      await new Promise((resolve) => window.setTimeout(resolve, 850));
      const memory = this.state.social.memories.at(-1);
      content.replaceChildren(
        el("span", "eyebrow success", "ERINNERUNG GESPEICHERT"),
        el("h2", undefined, memory?.title ?? "Der Abend bleibt im Gedächtnis"),
        el(
          "p",
          "dialog-line",
          memory?.description ?? "Mia wird sich an deine Entscheidung erinnern.",
        ),
        button("primary-button", "Zur Inselkarte", () => {
          propertyOverlay.remove();
          void this.render();
        }),
        button("text-button", "Soziales Gedächtnis ansehen", () => {
          propertyOverlay.remove();
          this.selectedContactId = "mia";
          this.openPhone("contacts");
        }),
      );
      content.querySelector<HTMLButtonElement>("button")?.focus();
    });
    content.append(choices);
    vignette.append(character, content);
    propertyOverlay.append(vignette);
    content.querySelector<HTMLButtonElement>("button")?.focus();
  }

  private closePhone(): void {
    this.phoneOverlay?.remove();
    this.phoneOverlay = null;
    this.selectedChatId = null;
    void this.render();
  }

  private renderPhoneOverlay(): void {
    const isRefresh = Boolean(this.phoneOverlay?.isConnected);
    this.phoneOverlay?.remove();
    const overlay = el("div", "phone-overlay");
    if (isRefresh) overlay.classList.add("is-refresh");
    overlay.dataset.testid = "phone-overlay";
    const device = el("section", "phone-device");
    device.setAttribute("role", "dialog");
    device.setAttribute("aria-modal", "true");
    device.setAttribute("aria-label", "Smartphone");

    const chrome = el("header", "phone-header");
    const close = button("phone-close", "×", () => this.closePhone());
    close.setAttribute("aria-label", "Smartphone schließen");
    chrome.append(
      el("span", "phone-time", "22:48"),
      el("strong", "phone-title", "ISLAND OS"),
      close,
    );

    const content = el("div", "phone-content");
    if (this.phoneTab === "jobs") this.renderJobs(content);
    if (this.phoneTab === "messages") this.renderMessages(content);
    if (this.phoneTab === "contacts") this.renderContact(content);

    const dock = el("nav", "phone-dock");
    const apps: Array<[PhoneTab, string, string]> = [
      ["messages", "✉", "Nachrichten"],
      ["jobs", "▤", "Aufträge"],
      ["contacts", "♥", "Kontakte"],
    ];
    for (const [app, icon, label] of apps) {
      const appButton = button(`phone-app${this.phoneTab === app ? " is-active" : ""}`, label, () => {
        this.feedback.tap();
        this.phoneTab = app;
        this.selectedChatId = null;
        this.renderPhoneOverlay();
      });
      appButton.prepend(el("span", "phone-app__icon", icon));
      dock.append(appButton);
    }

    device.append(chrome, content, dock);
    overlay.append(device);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) this.closePhone();
    });
    this.shell.append(overlay);
    this.phoneOverlay = overlay;
    if (this.selectedChatId) {
      window.requestAnimationFrame(() => {
        this.scrollConversationToCurrent(content);
      });
    }
    close.focus();
  }

  private renderJobs(container: HTMLElement): void {
    container.append(
      el("span", "phone-app-kicker", "AUFTRÄGE"),
      el("h1", "phone-heading", "Runner-Board"),
    );
    const pending = this.pendingReplyMessage();
    const available = this.missions.available(this.state);
    if (pending) {
      const character = getCharacter(pending.characterId);
      const lock = el("article", "phone-info-card");
      lock.append(
        el("strong", undefined, "Antwort erforderlich"),
        el(
          "p",
          undefined,
          `${character.name} schaltet den nächsten Treffpunkt frei, sobald du geantwortet hast.`,
        ),
        button("secondary-button", "Nachricht öffnen", () => {
          this.phoneTab = "messages";
          this.selectedChatId = pending.characterId;
          this.renderPhoneOverlay();
        }),
      );
      container.append(lock);
    }
    for (const mission of available) {
      const character = getCharacter(mission.characterId);
      const card = el("article", "job-card");
      const top = el("div", "job-card__top");
      const portrait = el("img", "avatar");
      portrait.src = getCharacterPortrait(mission.characterId);
      portrait.alt = character.name;
      const copy = el("div");
      copy.append(
        el("span", "eyebrow", character.name.toUpperCase()),
        el("h2", undefined, mission.title),
        el("p", undefined, mission.summary),
      );
      top.append(portrait, copy);
      card.append(top, this.rewardRow(mission));
      card.append(
        button("primary-button", "Treffpunkt auf der Insel", () => {
          this.closePhone();
        }),
      );
      container.append(card);
    }
    if (!pending && !available.length && !this.state.flags.includes("mia_home_visit_complete")) {
      const empty = el("div", "empty-state");
      empty.append(el("strong", undefined, "Noch kein neuer Auftrag"), el("p", undefined, "Prüfe deine Nachrichten."));
      container.append(empty);
    }
    if (this.state.completedMissions.length) {
      container.append(el("h2", "list-title", "Abgeschlossen"));
      for (const id of this.state.completedMissions) {
        const mission = getMission(id);
        const row = el("div", "completed-row");
        row.append(
          el("span", "success-mark", "✓"),
          el("span", undefined, mission.title),
          el("strong", "mission-style", this.state.missionStyles[id] ?? "Abgeschlossen"),
        );
        container.append(row);
      }
    }
  }

  private renderMessages(container: HTMLElement): void {
    container.append(el("span", "phone-app-kicker", "NACHRICHTEN"));
    if (this.selectedChatId) {
      this.renderConversation(container, this.selectedChatId);
      return;
    }

    container.append(el("h1", "phone-heading", "Chats"));
    const contactIds = [
      ...new Set(
        this.state.messages.map((message) => getMessage(message.id).characterId),
      ),
    ].sort((left, right) => {
      const latestFor = (characterId: CharacterId) =>
        Math.max(
          ...this.state.messages
            .filter((message) => getMessage(message.id).characterId === characterId)
            .map((message) => message.unlockedAt),
        );
      return latestFor(right) - latestFor(left);
    });

    for (const characterId of contactIds) {
      const conversation = this.state.messages
        .filter((message) => getMessage(message.id).characterId === characterId)
        .sort((left, right) => left.unlockedAt - right.unlockedAt);
      const latestState = conversation.at(-1);
      if (!latestState) continue;
      const latestDefinition = getMessage(latestState.id);
      const character = getCharacter(characterId);
      const unread = conversation.filter((message) => !message.read).length;
      const pending = conversation.find(
        (message) => !message.replyId && getMessage(message.id).replies.length > 0,
      );
      const selectedReply = latestState.replyId
        ? latestDefinition.replies.find((reply) => reply.id === latestState.replyId)
        : undefined;
      const preview =
        selectedReply?.response.at(-1) ?? latestDefinition.preview;
      const row = button(`message-row${unread ? " is-unread" : ""}`, "", () => {
        this.feedback.tap();
        this.selectedChatId = characterId;
        this.renderPhoneOverlay();
      });
      row.dataset.characterId = characterId;
      const portrait = el("img", "avatar");
      portrait.src = getCharacterPortrait(characterId);
      portrait.alt = character.name;
      const copy = el("span", "message-row__copy");
      copy.append(
        el("strong", undefined, character.name),
        el("span", undefined, preview),
      );
      const status = unread
        ? `${unread} NEU`
        : pending
          ? "ANTWORT"
          : "VERLAUF";
      row.append(portrait, copy, el("span", "message-row__time", status));
      container.append(row);
    }
  }

  private renderConversation(
    container: HTMLElement,
    characterId: CharacterId,
  ): void {
    const conversation = this.state.messages
      .filter((message) => getMessage(message.id).characterId === characterId)
      .sort((left, right) => left.unlockedAt - right.unlockedAt);
    if (!conversation.length) {
      this.selectedChatId = null;
      this.renderMessages(container);
      return;
    }
    const character = getCharacter(characterId);
    this.markConversationRead(characterId);

    const back = button("text-button chat-back", "‹ Alle Chats", () => {
      this.selectedChatId = null;
      this.renderPhoneOverlay();
    });
    const chatHeader = el("div", "chat-header");
    const portrait = el("img", "avatar");
    portrait.src = getCharacterPortrait(characterId);
    portrait.alt = character.name;
    chatHeader.append(portrait, el("div", undefined, undefined));
    chatHeader.lastElementChild?.append(
      el("strong", undefined, character.name),
      el(
        "span",
        undefined,
        `${conversation.length} ${conversation.length === 1 ? "Nachrichtenetappe" : "Nachrichtenetappen"}`,
      ),
    );
    const navigation = el("div", "chat-navigation");
    const jumpCurrent = button("chat-jump-current", "↓ Aktuell", () =>
      this.scrollConversationToCurrent(container),
    );
    navigation.append(back, chatHeader, jumpCurrent);

    const thread = el("div", "chat-thread");
    const pendingState = [...conversation]
      .reverse()
      .find(
        (message) =>
          !message.replyId && getMessage(message.id).replies.length > 0,
      );
    const currentState = pendingState ?? conversation.at(-1);
    for (const [index, messageState] of conversation.entries()) {
      const definition = getMessage(messageState.id);
      const isCurrent = messageState.id === currentState?.id;
      if (isCurrent && index > 0) {
        const divider = el("div", "chat-current-divider");
        divider.append(
          el("span", undefined, pendingState ? "NEUE ETAPPE" : "LETZTE ETAPPE"),
        );
        thread.append(divider);
      }
      const stage = el(
        "section",
        `chat-stage${isCurrent ? " is-current" : " is-complete"}`,
      );
      stage.dataset.messageId = messageState.id;
      if (isCurrent) {
        stage.dataset.chatCurrent = "true";
        stage.setAttribute("aria-current", "true");
      }
      const stageHeader = el("header", "chat-stage__header");
      stageHeader.append(
        el(
          "span",
          undefined,
          isCurrent
            ? pendingState
              ? "AKTUELL · ANTWORT AUSSTEHEND"
              : "AKTUELL · ABGESCHLOSSEN"
            : "ABGESCHLOSSEN",
        ),
        el("strong", undefined, `${index + 1}/${conversation.length}`),
      );
      stage.append(stageHeader);
      for (const line of definition.body) {
        stage.append(el("p", "chat-bubble chat-bubble--npc", line));
      }
      const selectedReply = definition.replies.find(
        (reply) => reply.id === messageState.replyId,
      );
      if (selectedReply) {
        stage.append(
          el("p", "chat-bubble chat-bubble--player", selectedReply.label),
        );
        for (const line of selectedReply.response) {
          stage.append(el("p", "chat-bubble chat-bubble--npc", line));
        }
      } else if (pendingState?.id === messageState.id) {
        const replyPanel = el("div", "message-replies");
        replyPanel.append(el("span", "reply-label", "DEINE ANTWORT"));
        for (const reply of definition.replies) {
          const replyButton = button("message-reply", "", () =>
            this.replyToMessage(definition, reply.id),
          );
          replyButton.dataset.replyId = reply.id;
          replyButton.append(
            el("strong", undefined, reply.label),
            el("small", undefined, reply.hint),
          );
          replyPanel.append(replyButton);
        }
        stage.append(replyPanel);
      }
      thread.append(stage);
    }

    if (!pendingState) {
      const nextMission = this.missions.available(this.state)[0];
      const closeLabel = nextMission
        ? `Smartphone schließen · ${getLocation(nextMission.startLocation).label}`
        : this.homeScenes.isPending(this.state)
          ? "Smartphone schließen · zum Anwesen"
          : this.state.flags.includes("mia_home_visit_complete")
            ? "Zurück zur Insel"
            : "Smartphone schließen";
      thread.append(button("primary-button chat-continue", closeLabel, () => this.closePhone()));
    }

    container.append(navigation, thread);
  }

  private scrollConversationToCurrent(container: HTMLElement): void {
    const current = container.querySelector<HTMLElement>(
      '[data-chat-current="true"]',
    );
    if (!current) {
      container.scrollTop = container.scrollHeight;
      return;
    }
    const navigation =
      container.querySelector<HTMLElement>(".chat-navigation");
    container.scrollTop = Math.max(
      0,
      current.offsetTop - (navigation?.offsetHeight ?? 0) - 10,
    );
  }

  private replyToMessage(definition: MessageDefinition, replyId: string): void {
    const reply = definition.replies.find((candidate) => candidate.id === replyId);
    if (!reply) return;
    this.feedback.choice();
    this.state = this.messages.reply(this.state, definition.id, replyId);
    this.persist();
    this.renderHud();
    const result = effectParts(reply.effects, true).join(" · ");
    if (result) this.events.emit("toast", result);
    this.renderPhoneOverlay();
  }

  private renderContact(container: HTMLElement): void {
    const character = getCharacter(this.selectedContactId);
    const relationship = this.state.relationships[this.selectedContactId];
    const tier = getRelationshipTier(relationship);
    const score = relationshipScore(relationship);
    container.append(el("span", "phone-app-kicker", "KONTAKTE"));
    const selector = el("div", "contact-selector");
    for (const id of ["lola", "mia"] as const) {
      const option = button(
        `contact-selector__item${this.selectedContactId === id ? " is-active" : ""}`,
        getCharacter(id).name,
        () => {
          this.feedback.tap();
          this.selectedContactId = id;
          this.renderPhoneOverlay();
        },
      );
      const avatar = el("img");
      avatar.src = getCharacterPortrait(id);
      avatar.alt = "";
      option.prepend(avatar);
      selector.append(option);
    }
    container.append(selector, el("h1", "phone-heading", character.name));
    const card = el("article", "contact-card");
    const portrait = el("img", "contact-hero");
    portrait.src = getCharacterPortrait(this.selectedContactId);
    portrait.alt = character.name;
    const tierCard = el("div", "tier-card");
    tierCard.append(
      el("span", "eyebrow", "BEZIEHUNGSSTATUS"),
      el("strong", undefined, tier.label),
      el("p", undefined, tier.description),
    );
    if (tier.nextAt !== null) {
      tierCard.append(el("span", "tier-next", `Noch ${tier.nextAt - score} Punkte bis zur nächsten Stufe`));
    }
    const home = this.property.current(this.state);
    const homeStatus = el("div", "contact-home");
    homeStatus.append(
      el("span", undefined, "⌂"),
      el("div", undefined, undefined),
      el("strong", undefined, home.impression),
    );
    homeStatus.children[1]?.append(
      el("small", undefined, "DEIN ZUHAUSE"),
      el("span", undefined, home.label),
    );
    card.append(
      portrait,
      el("p", "contact-traits", character.traits),
      tierCard,
      homeStatus,
      this.relationshipBar("Anziehung", relationship.attraction, "pink"),
      this.relationshipBar("Vertrauen", relationship.trust, "violet"),
      this.relationshipBar("Stimmung", relationship.mood, "orange"),
    );
    const lastReplyState = this.state.messages
      .slice()
      .sort((left, right) => right.unlockedAt - left.unlockedAt)
      .find(
        (message) =>
          Boolean(message.replyId) &&
          getMessage(message.id).characterId === this.selectedContactId,
      );
    const lastReply = lastReplyState?.replyId
      ? getMessage(lastReplyState.id).replies.find(
          (reply) => reply.id === lastReplyState.replyId,
        )
      : undefined;
    if (lastReply) {
      const last = el("div", "last-decision");
      last.append(
        el("span", "eyebrow", `LETZTE ANTWORT AN ${character.name.toUpperCase()}`),
        el("p", undefined, lastReply.label),
      );
      card.append(last);
    }
    const social = el("section", "social-memory");
    const socialHead = el("div", "social-memory__head");
    const socialTitle = el("div");
    socialTitle.append(
      el("span", "eyebrow", "LOLA ↔ MIA"),
      el("h2", undefined, `Freundschaft ${this.state.social.lolaMia.friendship}%`),
    );
    socialHead.append(
      socialTitle,
      el("strong", undefined, `Spannung ${this.state.social.lolaMia.tension}%`),
    );
    social.append(socialHead);
    const knownMemories = this.state.social.memories
      .filter((memory) => memory.knownBy.includes(this.selectedContactId))
      .slice()
      .reverse();
    if (knownMemories.length) {
      for (const memory of knownMemories) {
        const item = el("article", `social-memory__item tone-${memory.tone}`);
        item.append(
          el("span", "eyebrow", memory.knownBy.length > 1 ? "GETEILTES WISSEN" : "PRIVATES WISSEN"),
          el("strong", undefined, memory.title),
          el("p", undefined, memory.description),
        );
        social.append(item);
      }
    } else {
      social.append(
        el(
          "p",
          "social-memory__empty",
          `${character.name} kennt noch keine bedeutende gemeinsame Erinnerung.`,
        ),
      );
    }
    card.append(social);
    container.append(card);
  }

  private renderPickup(): void {
    const run = this.requireRun();
    const mission = getMission(run.missionId);
    const missionCharacter = getCharacter(mission.characterId);
    const location = getLocation(mission.startLocation);
    const screen = this.locationScreen(
      location.asset,
      location.label,
      run.currentReaction,
      mission.characterId,
    );
    const character = screen.querySelector<HTMLImageElement>(".character-art");
    const controller = character
      ? new CharacterReactionController(character, mission.characterId)
      : null;
    const panel = el("article", "dialog-panel");
    panel.append(
      el("span", "speaker", missionCharacter.name.toUpperCase()),
      el("p", "dialog-line", this.pickupPromptFor(mission)),
    );
    if (mission.id === "lola-cocktail-01") {
      panel.append(
        el(
          "p",
          "choice-explainer",
          "Antworten verändern Anziehung, Vertrauen, Stimmung oder Heat. Die Wirkung siehst du sofort.",
        ),
      );
    }
    const choices = this.choiceList(mission.pickupChoices, async (choice, clicked) => {
      this.disableChoiceList(clicked);
      this.feedback.choice();
      this.state = this.missions.choosePickup(this.state, choice.id);
      this.persist();
      this.showChoiceFeedback(panel, choice.effects);
      const line = panel.querySelector<HTMLElement>(".dialog-line");
      if (line) line.textContent = reactionLine(choice, missionCharacter.name);
      await controller?.setCharacterReaction(choice.reaction);
      await new Promise((resolve) => window.setTimeout(resolve, 850));
      await this.go("route");
    });
    panel.append(choices);
    screen.append(panel);
    this.stage.append(screen);
  }

  private async renderRoute(): Promise<void> {
    const run = this.requireRun();
    const mission = getMission(run.missionId);
    const routes = mission.routeIds.map(getRoute);
    const screen = el("section", "screen map-screen route-screen");
    const worldHost = el("div", "world-host");
    const brief = el("article", "floating-panel route-brief");
    const heatTier = getHeatTier(this.state.resources.heat);
    brief.append(
      el("span", "eyebrow", `AUFTRAG · ${mission.title}`),
      el("h1", undefined, "Welche Route passt zum Auftrag?"),
      el("p", undefined, `${getLocation(mission.startLocation).label} → ${getLocation(mission.destination).label}`),
      el("p", `route-heat route-heat--${heatTier.minimum}`, `Heat: ${heatTier.label} · ${heatTier.description}`),
    );
    const cards = el("div", "route-cards");
    for (const route of routes) {
      const card = button("route-card", "", () => {
        this.feedback.choice();
        this.state = this.missions.chooseRoute(this.state, route.id);
        this.persist();
        void this.go("travel");
      });
      card.dataset.testid = `route-${route.id}`;
      card.append(
        el("strong", undefined, route.label),
        el("span", "route-description", route.description),
        el("span", "route-advantage", `VORTEIL · ${route.advantage}`),
        el("span", "route-risk", `RISIKO · ${route.risk}`),
        el("span", "route-meta", `${Math.round(route.durationMs / 1_000)} SEK · ${route.tags.join(" · ").toUpperCase()}`),
      );
      cards.append(card);
    }
    brief.append(cards);
    screen.append(worldHost, brief);
    this.stage.append(screen);
    this.world = new WorldRenderer(worldHost);
    await this.world.init("route", routes);
  }

  private async renderTravel(): Promise<void> {
    const run = this.requireRun();
    if (!run.selectedRoute) throw new Error("Travel scene requires a selected route.");
    const mission = getMission(run.missionId);
    const route = getRoute(run.selectedRoute);
    const destination = getLocation(mission.destination);
    const screen = el("section", "screen travel-screen");
    const worldHost = el("div", "world-host");
    const top = el("div", "travel-status floating-panel");
    const destinationCopy = el("div");
    destinationCopy.append(el("span", "eyebrow", "ZIEL"), el("strong", undefined, destination.label));
    const timer = el("strong", "travel-timer", `${Math.ceil(route.durationMs / 1_000)}s`);
    const progressTrack = el("div", "progress-track");
    const progressFill = el("div", "progress-fill");
    progressTrack.append(progressFill);
    top.append(destinationCopy, timer, progressTrack);

    const eventPanel = el("article", "travel-event floating-panel is-waiting");
    eventPanel.append(
      el("span", "event-status", "UNTERWEGS"),
      el("strong", undefined, "Route läuft"),
      el("p", undefined, "Halte dich bereit – auf der Insel bleibt keine Fahrt ereignislos."),
    );
    const skip = button("secondary-button travel-skip", "Rest der Fahrt überspringen", () => this.world?.skip());
    skip.disabled = !run.selectedTravelChoice;
    skip.hidden = !run.selectedTravelChoice;
    eventPanel.append(skip);
    screen.append(worldHost, top, eventPanel);
    this.stage.append(screen);

    this.world = new WorldRenderer(worldHost);
    await this.world.init("travel", [route]);
    let eventTriggered = Boolean(run.selectedTravelChoice);
    if (run.selectedTravelChoice) this.renderResolvedTravelEvent(eventPanel, mission, skip);

    this.world.playRoute(
      route,
      (progress) => {
        progressFill.style.width = `${Math.round(progress * 100)}%`;
        timer.textContent = `${Math.max(0, Math.ceil((route.durationMs * (1 - progress)) / 1_000))}s`;
        if (!eventTriggered && progress >= mission.travelEvent.triggerProgress) {
          eventTriggered = true;
          this.world?.pause();
          this.renderTravelEvent(eventPanel, mission, skip);
        }
      },
      () => {
        if (!this.state.activeMission || this.state.activeMission.phase !== "travel") return;
        this.state = this.missions.arrive(this.state);
        this.persist();
        void this.go("encounter");
      },
    );
  }

  private renderTravelEvent(panel: HTMLElement, mission: MissionDefinition, skip: HTMLButtonElement): void {
    const missionCharacter = getCharacter(mission.characterId);
    panel.replaceChildren();
    panel.classList.remove("is-waiting", "is-resolved");
    panel.classList.add("is-active");
    panel.append(
      el("span", "event-status danger", "FAHRT PAUSIERT"),
      el("h2", undefined, mission.travelEvent.title),
      el("p", "event-prompt", this.travelPromptFor(mission)),
    );
    const choices = this.choiceList(mission.travelEvent.choices, async (choice, clicked) => {
      this.disableChoiceList(clicked);
      this.feedback.choice();
      this.state = this.missions.chooseTravel(this.state, choice.id);
      this.persist();
      this.showChoiceFeedback(panel, choice.effects);
      const prompt = panel.querySelector<HTMLElement>(".event-prompt");
      if (prompt) prompt.textContent = reactionLine(choice, missionCharacter.name);
      await new Promise((resolve) => window.setTimeout(resolve, 900));
      this.renderResolvedTravelEvent(panel, mission, skip);
      this.world?.resume();
    });
    panel.append(choices, skip);
  }

  private renderResolvedTravelEvent(
    panel: HTMLElement,
    mission: MissionDefinition,
    skip: HTMLButtonElement,
  ): void {
    panel.replaceChildren();
    panel.classList.remove("is-waiting", "is-active");
    panel.classList.add("is-resolved");
    panel.append(
      el("span", "event-status success", "EREIGNIS GELÖST"),
      el("strong", undefined, mission.travelEvent.title),
      el("p", undefined, "Die Fahrt läuft weiter. Deine Entscheidung zählt beim Abschluss."),
    );
    skip.disabled = false;
    skip.hidden = false;
    panel.append(skip);
  }

  private renderEncounter(): void {
    const run = this.requireRun();
    const mission = getMission(run.missionId);
    const missionCharacter = getCharacter(mission.characterId);
    const location = getLocation(mission.destination);
    const screen = this.locationScreen(
      location.asset,
      location.label,
      run.currentReaction,
      mission.characterId,
    );
    const character = screen.querySelector<HTMLImageElement>(".character-art");
    const controller = character
      ? new CharacterReactionController(character, mission.characterId)
      : null;
    const relationship = this.state.relationships[mission.characterId];
    const tier = getRelationshipTier(relationship);
    const relationshipCard = el("div", "relationship-card floating-panel");
    relationshipCard.append(
      el("span", "relationship-tier", tier.label),
      this.relationshipBar("Anziehung", relationship.attraction, "pink"),
      this.relationshipBar("Vertrauen", relationship.trust, "violet"),
      this.relationshipBar("Stimmung", relationship.mood, "orange"),
    );
    const panel = el("article", "dialog-panel encounter-dialog");
    const arrivalPrompt =
      (run.selectedRoute && mission.arrivalPrompts?.[run.selectedRoute]) ?? mission.encounterPrompt;
    panel.append(
      el("span", "speaker", missionCharacter.name.toUpperCase()),
      el("p", "dialog-line", arrivalPrompt),
    );
    const choices = this.choiceList(mission.encounterChoices, async (choice, clicked) => {
      this.disableChoiceList(clicked);
      this.feedback.choice();
      const before = this.state;
      const result = this.missions.completeWithResult(this.state, choice.id);
      this.state = result.state;
      this.persist();
      this.showChoiceFeedback(panel, choice.effects);
      const line = panel.querySelector<HTMLElement>(".dialog-line");
      if (line) line.textContent = reactionLine(choice, missionCharacter.name);
      await controller?.setCharacterReaction(choice.reaction);
      await new Promise((resolve) => window.setTimeout(resolve, 800));
      screen.querySelector(".relationship-card")?.remove();
      this.feedback.success();
      this.renderOutcome(panel, mission, before, this.state, result);
      this.renderHud();
      this.renderMissionBar();
    });
    panel.append(choices);
    screen.append(relationshipCard, panel);
    this.stage.append(screen);
  }

  private renderOutcome(
    panel: HTMLElement,
    mission: MissionDefinition,
    before: SaveState,
    after: SaveState,
    result: MissionResult,
  ): void {
    panel.replaceChildren();
    const resourceDiff = {
      cash: after.resources.cash - before.resources.cash,
      fans: after.resources.fans - before.resources.fans,
      heat: after.resources.heat - before.resources.heat,
      attraction:
        after.relationships[mission.characterId].attraction -
        before.relationships[mission.characterId].attraction,
      trust:
        after.relationships[mission.characterId].trust -
        before.relationships[mission.characterId].trust,
    };
    const title = el("div", "outcome-title");
    title.append(el("span", "success-mark large", "✓"), el("div", undefined, undefined));
    title.lastElementChild?.append(
      el("span", "eyebrow success", "AUFTRAG ABGESCHLOSSEN"),
      el("h2", undefined, mission.title),
      el("span", "style-badge", `Runner-Stil · ${result.style}`),
    );
    const results = el("div", "outcome-grid");
    results.append(
      this.outcomeMetric("Cash", resourceDiff.cash),
      this.outcomeMetric("Fans", resourceDiff.fans),
      this.outcomeMetric("Heat", resourceDiff.heat),
      this.outcomeMetric("Anziehung", resourceDiff.attraction),
      this.outcomeMetric("Vertrauen", resourceDiff.trust),
    );
    const breakdown = el("details", "outcome-breakdown");
    breakdown.append(el("summary", undefined, "Warum dieses Ergebnis?"));
    for (const entry of result.entries) {
      const row = el("div", "outcome-source");
      row.append(el("span", undefined, entry.label), el("strong", undefined, effectParts(entry.effects, true).join(" · ") || "Story"));
      breakdown.append(row);
    }
    const systemNotes = el("div", "outcome-system-notes");
    const heatTier = getHeatTier(after.resources.heat);
    systemNotes.append(el("span", undefined, `Heat: ${heatTier.label}`));
    if (result.heatPenalty > 0) systemNotes.append(el("span", "danger", `Auszahlungsabzug: $ ${result.heatPenalty}`));
    if (result.relationshipBonusFans > 0) {
      systemNotes.append(el("span", "success", `Beziehungsbonus: +${result.relationshipBonusFans} Fans`));
    }
    const character = getCharacter(mission.characterId);
    const messageButton = button(
      "primary-button",
      `${character.name}s Nachricht lesen`,
      () => {
        this.machine = new StateMachine<SceneId>("hub", SCENE_TRANSITIONS);
        this.openPhone("messages", mission.followUpMessageId);
      },
    );
    const islandButton = button("text-button", "Zur Inselkarte", () => void this.go("hub"));
    panel.append(title, results, systemNotes, breakdown, messageButton, islandButton);
  }

  private locationScreen(
    asset: string,
    locationLabel: string,
    reaction: NonNullable<SaveState["activeMission"]>["currentReaction"],
    characterId: CharacterId,
  ): HTMLElement {
    const screen = el("section", "screen location-screen");
    const background = el("img", "location-background");
    background.src = asset;
    background.alt = "";
    const shade = el("div", "location-shade");
    const badge = el("div", "location-badge floating-panel");
    badge.append(el("span", "pin-dot", "●"), el("strong", undefined, locationLabel.toUpperCase()));
    const character = el("img", "character-art");
    const characterDefinition = getCharacter(characterId);
    character.src = reactionAsset(reaction, characterId);
    character.alt = `${characterDefinition.name} – Reaktion ${reaction}`;
    character.dataset.reaction = reaction;
    screen.append(background, shade, badge, character);
    return screen;
  }

  private choiceList(
    choices: readonly Choice[],
    onChoice: (choice: Choice, clicked: HTMLButtonElement) => void | Promise<void>,
  ): HTMLElement {
    const list = el("div", "choice-list");
    for (const choice of choices) {
      const choiceButton = button("choice-button", "", () => void onChoice(choice, choiceButton));
      choiceButton.dataset.choiceId = choice.id;
      const copy = el("span", "choice-button__copy");
      copy.append(el("strong", undefined, choice.label), el("small", undefined, choice.hint));
      const effects = el("span", "choice-button__effect");
      for (const part of effectParts(choice.effects, false)) effects.append(el("span", undefined, part));
      choiceButton.append(copy, effects);
      list.append(choiceButton);
    }
    return list;
  }

  private showChoiceFeedback(container: HTMLElement, effects: Partial<Effects>): void {
    container.querySelector(".effect-feedback")?.remove();
    const parts = effectParts(effects, true);
    if (!parts.length) return;
    const feedback = el("div", "effect-feedback");
    for (const part of parts) feedback.append(el("span", undefined, part));
    container.append(feedback);
  }

  private disableChoiceList(clicked: HTMLButtonElement): void {
    const list = clicked.closest(".choice-list");
    list?.querySelectorAll("button").forEach((choiceButton) => {
      choiceButton.disabled = true;
      choiceButton.classList.toggle("is-selected", choiceButton === clicked);
    });
  }

  private rewardRow(mission: MissionDefinition): HTMLElement {
    const rewards = el("div", "reward-row");
    rewards.append(
      el("span", undefined, `$ ${moneyFormatter.format(mission.rewards.cash ?? 0)}`),
      el("span", undefined, `★ +${moneyFormatter.format(mission.rewards.fans ?? 0)} Fans`),
      el("span", "reward-risk", "! Heat: routenabhängig"),
    );
    return rewards;
  }

  private relationshipBar(label: string, value: number, tone: string): HTMLElement {
    const row = el("div", "relationship-row");
    const head = el("div", "relationship-row__head");
    head.append(el("span", undefined, label), el("strong", undefined, `${value}%`));
    const track = el("div", "relationship-track");
    const fill = el("div", `relationship-fill ${tone}`);
    fill.style.width = `${value}%`;
    track.append(fill);
    row.append(head, track);
    return row;
  }

  private outcomeMetric(label: string, value: number): HTMLElement {
    const item = el("div", "outcome-metric");
    item.append(
      el("span", undefined, label),
      el("strong", undefined, `${value >= 0 ? "+" : ""}${moneyFormatter.format(value)}`),
    );
    return item;
  }

  private startMission(id: string): void {
    this.phoneOverlay?.remove();
    this.phoneOverlay = null;
    this.feedback.choice();
    this.state = this.missions.start(this.state, id);
    this.persist();
    void this.go("pickup");
  }

  private pendingReplyMessage(): MessageDefinition | null {
    const pending = [...this.state.messages]
      .sort((left, right) => right.unlockedAt - left.unlockedAt)
      .find((message) => !message.replyId && getMessage(message.id).replies.length > 0);
    return pending ? getMessage(pending.id) : null;
  }

  private pickupPromptFor(mission: MissionDefinition): string {
    if (mission.id === "lola-cocktail-01") {
      if (this.state.flags.includes("ending_flirty") || this.state.messages[0]?.replyId === "intro-flirty") {
        return "„Sofort“, hast du geschrieben. Gar nicht schlecht. Was hast du für mich?";
      }
      if (this.state.messages[0]?.replyId === "intro-business") {
        return "Du wolltest über Bezahlung reden. Erst zeigst du mir, was du kannst.";
      }
    }
    if (mission.id === "lola-ice-02") {
      if (this.state.flags.includes("ice_plan_fast")) {
        return "Du hast Tempo versprochen. Das Eis wartet – meine Geduld nicht.";
      }
      if (this.state.flags.includes("ice_plan_paid")) {
        return "Dein Nachtzuschlag schmilzt zusammen mit dem Eis. Bereit?";
      }
      if (this.state.flags.includes("ice_plan_careful")) {
        return "Da ist ja meine angekündigte Kühlbox. Dann zeig mir dein Timing.";
      }
    }
    if (mission.id === "lola-playlist-03") {
      if (this.state.flags.includes("playlist_plan_tease")) {
        return "Du wolltest meinen Musikgeschmack kennen. Das Telefon bleibt trotzdem versiegelt.";
      }
      if (this.state.flags.includes("playlist_plan_professional")) {
        return "Telefon aus, Auftrag an – deine Worte. Keine neugierigen Finger.";
      }
      if (this.state.flags.includes("playlist_plan_discreet")) {
        return "Versiegelt rein, versiegelt raus. Genau so machen wir das.";
      }
    }
    return mission.pickupPrompt;
  }

  private travelPromptFor(mission: MissionDefinition): string {
    if (mission.id === "lola-ice-02") {
      if (this.state.flags.includes("ice_plan_fast")) {
        return "Du hast eine schnelle Fahrt versprochen. Die Kühlbox meldet trotzdem schon 4 °C.";
      }
      if (this.state.flags.includes("ice_plan_paid")) {
        return "Die Kühlbox meldet 4 °C. Noch zwei Grad, dann ist dein Nachtzuschlag weg.";
      }
    }
    return mission.travelEvent.prompt;
  }

  private endingSummary(): string {
    if (this.state.flags.includes("ending_loyal")) {
      return "Lola behandelt dich als festen, verlässlichen Partner für ihre nächsten Aufträge.";
    }
    if (this.state.flags.includes("ending_flirty")) {
      return "Zwischen euch bleibt mehr offen als nur der nächste Auftrag.";
    }
    if (this.state.flags.includes("ending_business")) {
      return "Du hast dir einen lukrativen Ruf als kompromissloser Profi aufgebaut.";
    }
    return "Deine Entscheidungen bleiben in Nachrichten und Kontakten sichtbar.";
  }

  private markConversationRead(characterId: CharacterId): void {
    const hasUnread = this.state.messages.some(
      (message) =>
        !message.read && getMessage(message.id).characterId === characterId,
    );
    if (!hasUnread) return;
    this.state = {
      ...this.state,
      messages: this.state.messages.map((message) =>
        getMessage(message.id).characterId === characterId
          ? { ...message, read: true }
          : message,
      ),
    };
    this.persist();
    this.renderHud();
  }

  private confirmAbort(): void {
    const approved = window.confirm("Auftrag wirklich abbrechen? Ausstehende Effekte gehen verloren.");
    if (!approved) return;
    this.state = this.missions.abort(this.state);
    this.persist();
    void this.go("hub");
  }

  private openMenu(): void {
    const existing = this.shell.querySelector(".modal-backdrop");
    existing?.remove();
    const overlay = el("div", "modal-backdrop");
    const modal = el("section", "modal");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "menu-title");
    const title = el("h2", undefined, "Menü");
    title.id = "menu-title";
    const heatTier = getHeatTier(this.state.resources.heat);
    modal.append(
      title,
      el("p", undefined, "Der Spielstand wird automatisch nach jeder Entscheidung gespeichert."),
      this.legend(),
      el("p", "menu-status", `Aktueller Heat-Status: ${heatTier.label} · ${heatTier.description}`),
      button(
        "secondary-button",
        document.fullscreenElement ? "Vollbild beenden" : "Vollbild starten",
        () => void this.toggleFullscreen(overlay),
      ),
      button(
        "secondary-button",
        `Sound: ${this.state.settings.sound ? "An" : "Aus"}`,
        () => this.toggleSetting("sound", overlay),
      ),
      button(
        "secondary-button",
        `Haptik: ${this.state.settings.haptics ? "An" : "Aus"}`,
        () => this.toggleSetting("haptics", overlay),
      ),
      button("secondary-button danger-button", "Spielstand zurücksetzen", () => {
        if (!window.confirm("Wirklich alle Fortschritte löschen?")) return;
        this.state = this.saveManager.reset();
        this.feedback.configure(this.state.settings);
        this.machine = new StateMachine<SceneId>("hub", SCENE_TRANSITIONS);
        overlay.remove();
        void this.render();
      }),
      button("text-button", "Schließen", () => overlay.remove()),
    );
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) overlay.remove();
    });
    overlay.append(modal);
    this.shell.append(overlay);
    title.focus();
  }

  private async toggleFullscreen(overlay: HTMLElement): Promise<void> {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        overlay.remove();
        this.events.emit("toast", "Vollbild beendet.");
        return;
      }
      if (!document.fullscreenEnabled || !document.documentElement.requestFullscreen) {
        overlay.remove();
        this.events.emit(
          "toast",
          "Auf diesem Gerät: Zum Home-Bildschirm hinzufügen und von dort starten.",
        );
        return;
      }
      await document.documentElement.requestFullscreen({
        navigationUI: "hide",
      });
      overlay.remove();
      this.events.emit("toast", "Vollbild aktiv.");
    } catch {
      overlay.remove();
      this.events.emit(
        "toast",
        "Vollbild wurde vom Browser nicht freigegeben.",
      );
    }
  }

  private legend(): HTMLElement {
    const legend = el("div", "symbol-legend");
    const items: Array<[string, string]> = [
      ["★", "Fans – deine Reichweite"],
      ["!", "Heat – Aufmerksamkeit der Insel"],
      ["♥", "Anziehung – persönliche Nähe"],
      ["◆", "Vertrauen – Zuverlässigkeit"],
      ["☀", "Stimmung – momentane Reaktion"],
    ];
    for (const [icon, label] of items) {
      const row = el("div");
      row.append(el("strong", undefined, icon), el("span", undefined, label));
      legend.append(row);
    }
    return legend;
  }

  private toggleSetting(key: keyof SaveState["settings"], overlay: HTMLElement): void {
    this.state = {
      ...this.state,
      settings: {
        ...this.state.settings,
        [key]: !this.state.settings[key],
      },
    };
    this.persist();
    this.feedback.configure(this.state.settings);
    overlay.remove();
    this.openMenu();
  }

  private requireRun(): NonNullable<SaveState["activeMission"]> {
    if (!this.state.activeMission) throw new Error("Expected an active mission.");
    return this.state.activeMission;
  }

  private persist(): void {
    if (!this.saveManager.save(this.state)) {
      this.events.emit("toast", "Spielstand konnte nicht gespeichert werden.");
    }
  }

  private async go(next: SceneId): Promise<void> {
    if (!this.machine.canTransition(next)) {
      this.machine = new StateMachine<SceneId>(next, SCENE_TRANSITIONS);
    } else {
      this.machine.transition(next);
    }
    await this.render();
  }

  private showToast(message: string): void {
    this.toast.textContent = message;
    this.toast.classList.add("is-visible");
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toast.classList.remove("is-visible"), 2_800);
  }
}
