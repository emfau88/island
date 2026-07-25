import { getLocation } from "../data/locations";
import { getMessage } from "../data/messages";
import { getMission } from "../data/missions";
import { getRoute } from "../data/routes";
import { WorldRenderer } from "../scenes/WorldRenderer";
import { MissionSystem } from "../systems/MissionSystem";
import { CharacterReactionController } from "../systems/ReactionSystem";
import { reactionAsset, ASSETS } from "./AssetManager";
import { EventBus } from "./EventBus";
import { SaveManager } from "./SaveManager";
import { StateMachine } from "./StateMachine";
import type {
  Choice,
  MissionDefinition,
  PhoneTab,
  SaveState,
  SceneId,
} from "./types";

interface GameEvents {
  toast: string;
}

const SCENE_TRANSITIONS: Record<SceneId, readonly SceneId[]> = {
  hub: ["phone", "pickup"],
  phone: ["hub", "pickup"],
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
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

function button(className: string, text: string, action: () => void): HTMLButtonElement {
  const element = el("button", className, text);
  element.type = "button";
  element.addEventListener("click", action);
  return element;
}

function metric(label: string, value: string, tone: string): HTMLElement {
  const item = el("div", `hud-metric ${tone}`);
  const icon = el("span", "hud-metric__icon", label);
  const number = el("strong", "hud-metric__value", value);
  item.append(icon, number);
  return item;
}

function effectSummary(choice: Choice): string {
  const parts: string[] = [];
  if ((choice.effects.attraction ?? 0) > 0) parts.push("♥");
  if ((choice.effects.trust ?? 0) > 0) parts.push("◆");
  if ((choice.effects.mood ?? 0) > 0) parts.push("☀");
  if ((choice.effects.heat ?? 0) > 0) parts.push("▲");
  if ((choice.effects.trust ?? 0) < 0 || (choice.effects.mood ?? 0) < 0) parts.push("!");
  return parts.join(" ") || "•";
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
  if (!state.activeMission) {
    return "hub";
  }
  return state.activeMission.phase;
}

export class Game {
  private readonly saveManager = new SaveManager();
  private readonly missions = new MissionSystem();
  private readonly events = new EventBus<GameEvents>();
  private state = this.saveManager.load();
  private machine = new StateMachine<SceneId>(sceneForSave(this.state), SCENE_TRANSITIONS);
  private phoneTab: PhoneTab = "jobs";
  private selectedMessageId: string | null = null;
  private world: WorldRenderer | null = null;
  private readonly shell = el("div", "app-shell");
  private readonly hud = el("header", "top-hud");
  private readonly stage = el("main", "game-stage");
  private readonly nav = el("nav", "bottom-nav");
  private readonly toast = el("div", "toast");
  private toastTimer: number | null = null;

  public constructor(private readonly root: HTMLElement) {
    this.shell.append(this.hud, this.stage, this.nav, this.toast);
    this.root.replaceChildren(this.shell);
    this.events.on("toast", (message) => this.showToast(message));
  }

  public async start(): Promise<void> {
    await this.render();
  }

  private async render(): Promise<void> {
    this.world?.destroy();
    this.world = null;
    this.renderHud();
    this.stage.replaceChildren();
    this.renderNav();
    this.shell.dataset.scene = this.machine.current;

    switch (this.machine.current) {
      case "hub":
        await this.renderHub();
        break;
      case "phone":
        this.renderPhone();
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
      metric("$", moneyFormatter.format(this.state.resources.cash), "cash"),
      metric("♥", moneyFormatter.format(this.state.resources.fans), "fans"),
      metric("▲", `${this.state.resources.heat}%`, "heat"),
    );
    const actions = el("div", "hud-actions");
    const unread = this.state.messages.filter((message) => !message.read).length;
    const inbox = button("icon-button", "✉", () => {
      if (this.state.activeMission) {
        this.events.emit("toast", "Nachrichten sind nach dem Auftrag wieder verfügbar.");
        return;
      }
      this.phoneTab = "messages";
      void this.go("phone");
    });
    inbox.setAttribute("aria-label", `Nachrichten${unread ? `, ${unread} ungelesen` : ""}`);
    if (unread) {
      const badge = el("span", "badge", String(unread));
      inbox.append(badge);
    }
    const menu = button("icon-button", "☰", () => this.openMenu());
    menu.setAttribute("aria-label", "Menü öffnen");
    actions.append(inbox, menu);
    this.hud.append(resources, actions);
  }

  private renderNav(): void {
    this.nav.replaceChildren();
    if (this.state.activeMission) {
      const mission = getMission(this.state.activeMission.missionId);
      const progress = ["pickup", "route", "travel", "encounter"].indexOf(this.state.activeMission.phase) + 1;
      const status = el("div", "mission-progress");
      status.append(
        el("span", "eyebrow", `AUFTRAG · ${progress}/4`),
        el("strong", undefined, mission.title),
      );
      const abort = button("nav-abort", "Abbrechen", () => this.confirmAbort());
      this.nav.append(status, abort);
      return;
    }

    const items: Array<{ label: string; icon: string; scene: SceneId; tab?: PhoneTab }> = [
      { label: "Insel", icon: "⌂", scene: "hub" },
      { label: "Aufträge", icon: "▤", scene: "phone", tab: "jobs" },
      { label: "Nachrichten", icon: "✉", scene: "phone", tab: "messages" },
      { label: "Kontakt", icon: "♥", scene: "phone", tab: "contacts" },
    ];
    for (const item of items) {
      const active =
        this.machine.current === item.scene &&
        (item.scene === "hub" || (item.tab !== undefined && item.tab === this.phoneTab));
      const navButton = button(`nav-button${active ? " is-active" : ""}`, item.label, () => {
        if (item.tab) this.phoneTab = item.tab;
        void this.go(item.scene);
      });
      navButton.prepend(el("span", "nav-button__icon", item.icon));
      this.nav.append(navButton);
    }
  }

  private async renderHub(): Promise<void> {
    const screen = el("section", "screen map-screen");
    screen.setAttribute("aria-labelledby", "hub-title");
    const worldHost = el("div", "world-host");
    const brand = el("div", "brand-lockup");
    const brandMain = el("h1", undefined, "wh0re");
    brandMain.id = "hub-title";
    brand.append(brandMain, el("span", undefined, "ISLAND"));
    screen.append(worldHost, brand);

    const available = this.missions.available(this.state);
    const brief = el("article", "floating-panel hub-brief");
    if (available[0]) {
      const mission = available[0];
      brief.append(
        el("span", "eyebrow", "NÄCHSTER AUFTRAG"),
        el("h2", undefined, mission.title),
        el("p", undefined, mission.summary),
        this.rewardRow(mission),
        button("primary-button", "Auftrag ansehen", () => {
          this.phoneTab = "jobs";
          void this.go("phone");
        }),
      );
    } else {
      brief.append(
        el("span", "eyebrow success", "LOLA-SLICE ABGESCHLOSSEN"),
        el("h2", undefined, "Du bist jetzt Insider."),
        el("p", undefined, "Alle drei Lola-Aufträge sind abgeschlossen. Ihre letzte Nachricht wartet im Smartphone."),
        button("primary-button", "Nachricht öffnen", () => {
          this.phoneTab = "messages";
          void this.go("phone");
        }),
      );
    }
    screen.append(brief);
    this.stage.append(screen);
    this.world = new WorldRenderer(worldHost);
    await this.world.init("hub");
  }

  private renderPhone(): void {
    const screen = el("section", "screen phone-screen");
    const phone = el("div", "phone-frame");
    const header = el("div", "phone-header");
    header.append(el("span", "phone-time", "22:48"), el("h1", undefined, "ISLAND PHONE"), el("span", "phone-signal", "●●●"));
    const tabs = el("div", "phone-tabs");
    const definitions: Array<[PhoneTab, string]> = [
      ["jobs", "Aufträge"],
      ["messages", "Nachrichten"],
      ["contacts", "Kontakt"],
    ];
    for (const [tab, label] of definitions) {
      const tabButton = button(`phone-tab${this.phoneTab === tab ? " is-active" : ""}`, label, () => {
        this.phoneTab = tab;
        this.selectedMessageId = null;
        void this.render();
      });
      tabs.append(tabButton);
    }
    const content = el("div", "phone-content");
    if (this.phoneTab === "jobs") this.renderJobs(content);
    if (this.phoneTab === "messages") this.renderMessages(content);
    if (this.phoneTab === "contacts") this.renderContact(content);
    phone.append(header, tabs, content);
    screen.append(phone);
    this.stage.append(screen);
  }

  private renderJobs(container: HTMLElement): void {
    const available = this.missions.available(this.state);
    container.append(el("p", "section-kicker", `${available.length} verfügbar · ${this.state.completedMissions.length} abgeschlossen`));
    if (!available.length) {
      const empty = el("div", "empty-state");
      empty.append(el("strong", undefined, "Alle Lola-Aufträge erledigt"), el("p", undefined, "Sieh in den Nachrichten nach, wie deine Entscheidungen angekommen sind."));
      container.append(empty);
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
      const start = button("primary-button", "Auftrag starten", () => this.startMission(mission.id));
      start.dataset.testid = `start-${mission.id}`;
      card.append(start);
      container.append(card);
    }
    if (this.state.completedMissions.length) {
      const completedTitle = el("h2", "list-title", "Abgeschlossen");
      container.append(completedTitle);
      for (const id of this.state.completedMissions) {
        const mission = getMission(id);
        const row = el("div", "completed-row");
        row.append(el("span", "success-mark", "✓"), el("span", undefined, mission.title));
        container.append(row);
      }
    }
  }

  private renderMessages(container: HTMLElement): void {
    if (this.selectedMessageId) {
      const definition = getMessage(this.selectedMessageId);
      const back = button("text-button", "‹ Alle Chats", () => {
        this.selectedMessageId = null;
        void this.render();
      });
      const chatHeader = el("div", "chat-header");
      const portrait = el("img", "avatar");
      portrait.src = ASSETS.portrait;
      portrait.alt = "";
      chatHeader.append(portrait, el("strong", undefined, definition.sender));
      const thread = el("div", "chat-thread");
      for (const line of definition.body) {
        thread.append(el("p", "chat-bubble", line));
      }
      container.append(back, chatHeader, thread);
      return;
    }

    container.append(el("p", "section-kicker", "Persönliche Nachrichten"));
    const ordered = [...this.state.messages].sort((left, right) => right.unlockedAt - left.unlockedAt);
    for (const messageState of ordered) {
      const definition = getMessage(messageState.id);
      const row = button(`message-row${messageState.read ? "" : " is-unread"}`, "", () => {
        this.state = {
          ...this.state,
          messages: this.state.messages.map((item) =>
            item.id === messageState.id ? { ...item, read: true } : item,
          ),
        };
        this.persist();
        this.selectedMessageId = messageState.id;
        void this.render();
      });
      const portrait = el("img", "avatar");
      portrait.src = ASSETS.portrait;
      portrait.alt = "";
      const copy = el("span", "message-row__copy");
      copy.append(el("strong", undefined, definition.sender), el("span", undefined, definition.preview));
      const time = el("span", "message-row__time", messageState.read ? "22:47" : "NEU");
      row.append(portrait, copy, time);
      container.append(row);
    }
  }

  private renderContact(container: HTMLElement): void {
    const relationship = this.state.relationships.lola;
    const card = el("article", "contact-card");
    const portrait = el("img", "contact-hero");
    portrait.src = ASSETS.portrait;
    portrait.alt = "Lola";
    card.append(portrait, el("span", "eyebrow", "VIP-KONTAKT"), el("h1", undefined, "Lola"));
    const traits = el("p", "contact-traits", "Spontan · verspielt · aufmerksamkeitsliebend");
    card.append(
      traits,
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
    panel.append(el("span", "speaker", "LOLA"), el("p", "dialog-line", mission.pickupPrompt));
    const choices = this.choiceList(mission.pickupChoices, async (choice, clicked) => {
      this.disableChoiceList(clicked);
      this.state = this.missions.choosePickup(this.state, choice.id);
      this.persist();
      const line = panel.querySelector<HTMLElement>(".dialog-line");
      if (line) line.textContent = reactionLine(choice);
      await controller?.setCharacterReaction(choice.reaction);
      await new Promise((resolve) => window.setTimeout(resolve, 550));
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
    brief.append(
      el("span", "eyebrow", `AUFTRAG · ${mission.title}`),
      el("h1", undefined, "Route wählen"),
      el("p", undefined, `${getLocation(mission.startLocation).label} → ${getLocation(mission.destination).label}`),
    );
    const cards = el("div", "route-cards");
    for (const route of routes) {
      const card = button("route-card", "", () => {
        this.state = this.missions.chooseRoute(this.state, route.id);
        this.persist();
        void this.go("travel");
      });
      card.dataset.testid = `route-${route.id}`;
      card.append(
        el("strong", undefined, route.label),
        el("span", undefined, route.description),
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
    if (!run.selectedRoute) {
      throw new Error("Travel scene requires a selected route.");
    }
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

    const conversation = el("article", "travel-conversation floating-panel");
    const prompt = el("div", "travel-prompt");
    const avatar = el("img", "avatar");
    avatar.src = ASSETS.portrait;
    avatar.alt = "";
    prompt.append(avatar, el("p", undefined, mission.travelPrompt));
    const choices = this.choiceList(mission.travelChoices, (choice, clicked) => {
      this.disableChoiceList(clicked);
      this.state = this.missions.chooseTravel(this.state, choice.id);
      this.persist();
      const promptText = prompt.querySelector("p");
      if (promptText) promptText.textContent = reactionLine(choice);
    });
    if (run.selectedTravelChoice) {
      choices.querySelectorAll("button").forEach((choiceButton) => {
        choiceButton.disabled = true;
      });
    }
    const skip = button("secondary-button travel-skip", "Fahrt überspringen", () => this.world?.skip());
    skip.disabled = true;
    conversation.append(prompt, choices, skip);
    screen.append(worldHost, top, conversation);
    this.stage.append(screen);

    this.world = new WorldRenderer(worldHost);
    await this.world.init("travel", [route]);
    skip.disabled = false;
    this.world.playRoute(
      route,
      (progress) => {
        progressFill.style.width = `${Math.round(progress * 100)}%`;
        timer.textContent = `${Math.max(0, Math.ceil((route.durationMs * (1 - progress)) / 1_000))}s`;
      },
      () => {
        if (!this.state.activeMission || this.state.activeMission.phase !== "travel") {
          return;
        }
        this.state = this.missions.arrive(this.state);
        this.persist();
        void this.go("encounter");
      },
    );
  }

  private renderEncounter(): void {
    const run = this.requireRun();
    const mission = getMission(run.missionId);
    const location = getLocation(mission.destination);
    const screen = this.locationScreen(location.asset, location.label, run.currentReaction);
    const character = screen.querySelector<HTMLImageElement>(".character-art");
    const controller = character ? new CharacterReactionController(character) : null;
    const relationshipCard = el("div", "relationship-card floating-panel");
    relationshipCard.append(
      this.relationshipBar("Anziehung", this.state.relationships.lola.attraction, "pink"),
      this.relationshipBar("Vertrauen", this.state.relationships.lola.trust, "violet"),
      this.relationshipBar("Stimmung", this.state.relationships.lola.mood, "orange"),
    );
    const panel = el("article", "dialog-panel encounter-dialog");
    panel.append(el("span", "speaker", "LOLA"), el("p", "dialog-line", mission.encounterPrompt));
    const choices = this.choiceList(mission.encounterChoices, async (choice, clicked) => {
      this.disableChoiceList(clicked);
      const before = this.state;
      this.state = this.missions.complete(this.state, choice.id);
      this.persist();
      const line = panel.querySelector<HTMLElement>(".dialog-line");
      if (line) line.textContent = reactionLine(choice);
      await controller?.setCharacterReaction(choice.reaction);
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      screen.querySelector(".relationship-card")?.remove();
      this.renderOutcome(panel, mission, before, this.state);
      this.renderHud();
      this.renderNav();
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
    const titleCopy = title.lastElementChild;
    titleCopy?.append(el("span", "eyebrow success", "AUFTRAG ABGESCHLOSSEN"), el("h2", undefined, mission.title));
    const results = el("div", "outcome-grid");
    results.append(
      this.outcomeMetric("$", resourceDiff.cash),
      this.outcomeMetric("Fans", resourceDiff.fans),
      this.outcomeMetric("Heat", resourceDiff.heat),
      this.outcomeMetric("Anziehung", resourceDiff.attraction),
      this.outcomeMetric("Vertrauen", resourceDiff.trust),
    );
    const continueButton = button("primary-button", "Zur Inselkarte", () => {
      void this.go("hub");
    });
    panel.append(title, results, el("p", "outcome-note", "Eine neue Nachricht von Lola ist angekommen."), continueButton);
  }

  private locationScreen(asset: string, locationLabel: string, reaction: NonNullable<SaveState["activeMission"]>["currentReaction"]): HTMLElement {
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
      choiceButton.append(copy, el("span", "choice-button__effect", effectSummary(choice)));
      list.append(choiceButton);
    }
    return list;
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
      el("span", undefined, `♥ +${moneyFormatter.format(mission.rewards.fans ?? 0)}`),
      el("span", undefined, `▲ +${mission.rewards.heat ?? 0}`),
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
    item.append(el("span", undefined, label), el("strong", undefined, `${value >= 0 ? "+" : ""}${moneyFormatter.format(value)}`));
    return item;
  }

  private startMission(id: string): void {
    this.state = this.missions.start(this.state, id);
    this.persist();
    void this.go("pickup");
  }

  private confirmAbort(): void {
    const approved = window.confirm("Auftrag wirklich abbrechen? Ausstehende Effekte gehen verloren.");
    if (!approved) {
      return;
    }
    this.state = this.missions.abort(this.state);
    this.persist();
    void this.go("hub");
  }

  private openMenu(): void {
    const overlay = el("div", "modal-backdrop");
    const modal = el("section", "modal");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "menu-title");
    const title = el("h2", undefined, "Menü");
    title.id = "menu-title";
    modal.append(
      title,
      el("p", undefined, "Der Spielstand wird lokal und automatisch nach jeder Entscheidung gespeichert."),
      button("secondary-button", "Spielstand zurücksetzen", () => {
        if (!window.confirm("Wirklich alle Fortschritte löschen?")) return;
        this.state = this.saveManager.reset();
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

  private requireRun(): NonNullable<SaveState["activeMission"]> {
    if (!this.state.activeMission) {
      throw new Error("Expected an active mission.");
    }
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
