import { getLocation } from "../data/locations";
import { getMessage } from "../data/messages";
import { getMission } from "../data/missions";
import { getRoute } from "../data/routes";
import { WorldRenderer } from "../scenes/WorldRenderer";
import { FeedbackSystem } from "../systems/FeedbackSystem";
import { MessageSystem } from "../systems/MessageSystem";
import { MissionSystem } from "../systems/MissionSystem";
import {
  getHeatTier,
  getRelationshipTier,
  relationshipScore,
} from "../systems/ProgressionSystem";
import { CharacterReactionController } from "../systems/ReactionSystem";
import { reactionAsset, ASSETS } from "./AssetManager";
import { EventBus } from "./EventBus";
import { SaveManager } from "./SaveManager";
import { StateMachine } from "./StateMachine";
import {
  type Choice,
  type Effects,
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

function reactionLine(choice: Choice): string {
  const lines = {
    neutral: "Lola wartet auf deine Entscheidung.",
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
  private readonly feedback = new FeedbackSystem();
  private readonly events = new EventBus<GameEvents>();
  private state = this.saveManager.load();
  private machine = new StateMachine<SceneId>(sceneForSave(this.state), SCENE_TRANSITIONS);
  private phoneTab: PhoneTab = "messages";
  private selectedMessageId: string | null = null;
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
      brief.append(
        el("span", "eyebrow", "TREFFPUNKT MARKIERT"),
        el("h2", undefined, mission.title),
        el("p", undefined, mission.summary),
        el("div", "objective-location", `● ${location.label}`),
        this.rewardRow(mission),
        button("primary-button", `Lola am ${location.label} treffen`, () => this.startMission(mission.id)),
      );
      brief.dataset.testid = `hub-${mission.id}`;
    } else if (this.state.completedMissions.length === 3) {
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
    await this.world.init("hub");
  }

  private openPhone(tab: PhoneTab = this.phoneTab, messageId?: string): void {
    if (this.state.activeMission) {
      this.events.emit("toast", "Smartphone nach diesem Missionsschritt verfügbar.");
      return;
    }
    this.phoneTab = tab;
    if (messageId !== undefined) this.selectedMessageId = messageId;
    this.renderPhoneOverlay();
  }

  private closePhone(): void {
    this.phoneOverlay?.remove();
    this.phoneOverlay = null;
    this.selectedMessageId = null;
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
        this.selectedMessageId = null;
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
    if (this.selectedMessageId) {
      const messageState = this.state.messages.find((message) => message.id === this.selectedMessageId);
      if (messageState?.replyId) {
        window.requestAnimationFrame(() => {
          content.scrollTop = content.scrollHeight;
        });
      }
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
      const lock = el("article", "phone-info-card");
      lock.append(
        el("strong", undefined, "Antwort erforderlich"),
        el("p", undefined, "Lola schaltet den nächsten Treffpunkt frei, sobald du ihr geantwortet hast."),
        button("secondary-button", "Nachricht öffnen", () => {
          this.phoneTab = "messages";
          this.selectedMessageId = pending.id;
          this.renderPhoneOverlay();
        }),
      );
      container.append(lock);
    }
    for (const mission of available) {
      const card = el("article", "job-card");
      const top = el("div", "job-card__top");
      const portrait = el("img", "avatar");
      portrait.src = ASSETS.portrait;
      portrait.alt = "Lola";
      const copy = el("div");
      copy.append(el("span", "eyebrow", "LOLA"), el("h2", undefined, mission.title), el("p", undefined, mission.summary));
      top.append(portrait, copy);
      card.append(top, this.rewardRow(mission));
      card.append(
        button("primary-button", "Treffpunkt auf der Insel", () => {
          this.closePhone();
        }),
      );
      container.append(card);
    }
    if (!pending && !available.length && this.state.completedMissions.length < 3) {
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
    if (this.selectedMessageId) {
      this.renderMessageThread(container, this.selectedMessageId);
      return;
    }

    container.append(el("h1", "phone-heading", "Chats"));
    const ordered = [...this.state.messages].sort((left, right) => right.unlockedAt - left.unlockedAt);
    for (const messageState of ordered) {
      const definition = getMessage(messageState.id);
      const row = button(`message-row${messageState.read ? "" : " is-unread"}`, "", () => {
        this.feedback.tap();
        this.selectedMessageId = messageState.id;
        this.markMessageRead(messageState.id);
        this.renderPhoneOverlay();
      });
      const portrait = el("img", "avatar");
      portrait.src = ASSETS.portrait;
      portrait.alt = "";
      const copy = el("span", "message-row__copy");
      copy.append(el("strong", undefined, definition.sender), el("span", undefined, definition.preview));
      const status = messageState.replyId ? "BEANTWORTET" : messageState.read ? "OFFEN" : "NEU";
      row.append(portrait, copy, el("span", "message-row__time", status));
      container.append(row);
    }
  }

  private renderMessageThread(container: HTMLElement, messageId: string): void {
    const definition = getMessage(messageId);
    const messageState = this.state.messages.find((message) => message.id === messageId);
    if (!messageState) return;
    this.markMessageRead(messageId);

    const back = button("text-button chat-back", "‹ Alle Chats", () => {
      this.selectedMessageId = null;
      this.renderPhoneOverlay();
    });
    const chatHeader = el("div", "chat-header");
    const portrait = el("img", "avatar");
    portrait.src = ASSETS.portrait;
    portrait.alt = "";
    chatHeader.append(portrait, el("div", undefined, undefined));
    chatHeader.lastElementChild?.append(el("strong", undefined, definition.sender), el("span", undefined, "online"));

    const thread = el("div", "chat-thread");
    for (const line of definition.body) thread.append(el("p", "chat-bubble chat-bubble--npc", line));

    const selectedReply = definition.replies.find((reply) => reply.id === messageState.replyId);
    if (selectedReply) {
      thread.append(el("p", "chat-bubble chat-bubble--player", selectedReply.label));
      for (const line of selectedReply.response) thread.append(el("p", "chat-bubble chat-bubble--npc", line));
      const nextMission = this.missions.available(this.state)[0];
      const closeLabel = nextMission
        ? `Smartphone schließen · ${getLocation(nextMission.startLocation).label}`
        : this.state.completedMissions.length === 3
          ? "Zurück zur Insel"
          : "Smartphone schließen";
      thread.append(button("primary-button chat-continue", closeLabel, () => this.closePhone()));
    } else {
      const replyPanel = el("div", "message-replies");
      replyPanel.append(el("span", "reply-label", "DEINE ANTWORT"));
      for (const reply of definition.replies) {
        const replyButton = button("message-reply", "", () => this.replyToMessage(definition, reply.id));
        replyButton.dataset.replyId = reply.id;
        replyButton.append(el("strong", undefined, reply.label), el("small", undefined, reply.hint));
        replyPanel.append(replyButton);
      }
      thread.append(replyPanel);
    }

    container.append(back, chatHeader, thread);
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
    const relationship = this.state.relationships.lola;
    const tier = getRelationshipTier(relationship);
    const score = relationshipScore(relationship);
    container.append(el("span", "phone-app-kicker", "KONTAKTE"), el("h1", "phone-heading", "Lola"));
    const card = el("article", "contact-card");
    const portrait = el("img", "contact-hero");
    portrait.src = ASSETS.portrait;
    portrait.alt = "Lola";
    const tierCard = el("div", "tier-card");
    tierCard.append(
      el("span", "eyebrow", "BEZIEHUNGSSTATUS"),
      el("strong", undefined, tier.label),
      el("p", undefined, tier.description),
    );
    if (tier.nextAt !== null) {
      tierCard.append(el("span", "tier-next", `Noch ${tier.nextAt - score} Punkte bis zur nächsten Stufe`));
    }
    card.append(
      portrait,
      el("p", "contact-traits", "Spontan · verspielt · aufmerksamkeitsliebend"),
      tierCard,
      this.relationshipBar("Anziehung", relationship.attraction, "pink"),
      this.relationshipBar("Vertrauen", relationship.trust, "violet"),
      this.relationshipBar("Stimmung", relationship.mood, "orange"),
    );
    if (this.state.lastDecision) {
      const last = el("div", "last-decision");
      last.append(el("span", "eyebrow", "LETZTE ENTSCHEIDUNG"), el("p", undefined, this.state.lastDecision));
      card.append(last);
    }
    container.append(card);
  }

  private renderPickup(): void {
    const run = this.requireRun();
    const mission = getMission(run.missionId);
    const location = getLocation(mission.startLocation);
    const screen = this.locationScreen(location.asset, location.label, run.currentReaction);
    const character = screen.querySelector<HTMLImageElement>(".character-art");
    const controller = character ? new CharacterReactionController(character) : null;
    const panel = el("article", "dialog-panel");
    panel.append(
      el("span", "speaker", "LOLA"),
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
      if (line) line.textContent = reactionLine(choice);
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
      if (prompt) prompt.textContent = reactionLine(choice);
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
    const location = getLocation(mission.destination);
    const screen = this.locationScreen(location.asset, location.label, run.currentReaction);
    const character = screen.querySelector<HTMLImageElement>(".character-art");
    const controller = character ? new CharacterReactionController(character) : null;
    const relationship = this.state.relationships.lola;
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
    panel.append(el("span", "speaker", "LOLA"), el("p", "dialog-line", arrivalPrompt));
    const choices = this.choiceList(mission.encounterChoices, async (choice, clicked) => {
      this.disableChoiceList(clicked);
      this.feedback.choice();
      const before = this.state;
      const result = this.missions.completeWithResult(this.state, choice.id);
      this.state = result.state;
      this.persist();
      this.showChoiceFeedback(panel, choice.effects);
      const line = panel.querySelector<HTMLElement>(".dialog-line");
      if (line) line.textContent = reactionLine(choice);
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
      attraction: after.relationships.lola.attraction - before.relationships.lola.attraction,
      trust: after.relationships.lola.trust - before.relationships.lola.trust,
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
    const messageButton = button("primary-button", "Lolas Nachricht lesen", () => {
      this.machine = new StateMachine<SceneId>("hub", SCENE_TRANSITIONS);
      this.selectedMessageId = mission.followUpMessageId;
      this.openPhone("messages", mission.followUpMessageId);
    });
    const islandButton = button("text-button", "Zur Inselkarte", () => void this.go("hub"));
    panel.append(title, results, systemNotes, breakdown, messageButton, islandButton);
  }

  private locationScreen(
    asset: string,
    locationLabel: string,
    reaction: NonNullable<SaveState["activeMission"]>["currentReaction"],
  ): HTMLElement {
    const screen = el("section", "screen location-screen");
    const background = el("img", "location-background");
    background.src = asset;
    background.alt = "";
    const shade = el("div", "location-shade");
    const badge = el("div", "location-badge floating-panel");
    badge.append(el("span", "pin-dot", "●"), el("strong", undefined, locationLabel.toUpperCase()));
    const character = el("img", "character-art");
    character.src = reactionAsset(reaction);
    character.alt = `Lola – Reaktion ${reaction}`;
    character.dataset.reaction = reaction;
    screen.append(background, shade, badge, character);
    return screen;
  }

  private choiceList(
    choices: Choice[],
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

  private markMessageRead(id: string): void {
    const current = this.state.messages.find((message) => message.id === id);
    if (!current || current.read) return;
    this.state = {
      ...this.state,
      messages: this.state.messages.map((message) =>
        message.id === id ? { ...message, read: true } : message,
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
