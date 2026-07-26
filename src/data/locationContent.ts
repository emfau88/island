import type {
  CharacterId,
  Effects,
  LocationId,
  SocialConsequences,
} from "../core/types";

export interface LocationActivityDefinition {
  id: string;
  locationId: Exclude<LocationId, "runner-home">;
  title: string;
  description: string;
  actionLabel: string;
  resultText: string;
  effects: Partial<Effects>;
  characterId?: CharacterId;
  requiredFlags: string[];
  requiredDiscoveries: string[];
  minimumMissions: number;
  discoveryId?: string;
  completionFlags?: string[];
  social?: SocialConsequences;
  visual: {
    icon: string;
    sceneLabel: string;
    x: number;
    y: number;
    tone: "cyan" | "pink" | "amber" | "violet" | "green";
  };
}

export const LOCATION_ACTIVITIES: readonly LocationActivityDefinition[] = [
  {
    id: "pool-overhear-afterhours",
    locationId: "pool",
    title: "Das Gespräch am Beckenrand",
    description: "Zwei Gäste reden über die Zeiten, in denen der Pool fast leer ist.",
    actionLabel: "Unauffällig zuhören",
    resultText: "Du kennst jetzt das ruhige Zeitfenster für spätere Pooltreffen.",
    effects: { fans: 40 },
    requiredFlags: [],
    requiredDiscoveries: [],
    minimumMissions: 0,
    discoveryId: "pool_afterhours_pattern",
    completionFlags: ["pool_afterhours_known"],
    visual: {
      icon: "◌",
      sceneLabel: "Leise Stimmen",
      x: 22,
      y: 42,
      tone: "violet",
    },
  },
  {
    id: "pool-quiet-reset",
    locationId: "pool",
    title: "Eine Minute untertauchen",
    description: "Kein Auftrag, kein Gespräch – nur kurz aus dem Blickfeld verschwinden.",
    actionLabel: "Heat abbauen",
    resultText: "Für einen Moment achtet niemand auf den Runner.",
    effects: { heat: -4 },
    requiredFlags: [],
    requiredDiscoveries: [],
    minimumMissions: 1,
    visual: {
      icon: "≈",
      sceneLabel: "Kurz abtauchen",
      x: 69,
      y: 56,
      tone: "cyan",
    },
  },
  {
    id: "yacht-private-manifest",
    locationId: "yacht",
    title: "Das private Anlegerbuch",
    description: "Die öffentlich sichtbaren Abfahrten passen nicht zu allen Booten im Hafen.",
    actionLabel: "Abfahrten vergleichen",
    resultText: "Eine wiederkehrende, nicht eingetragene Nachtfahrt fällt dir auf.",
    effects: { fans: 30 },
    requiredFlags: [],
    requiredDiscoveries: [],
    minimumMissions: 1,
    discoveryId: "unlisted_yacht_departure",
    completionFlags: ["unlisted_yacht_known"],
    visual: {
      icon: "≋",
      sceneLabel: "Anlegerbuch",
      x: 29,
      y: 61,
      tone: "cyan",
    },
  },
  {
    id: "yacht-cooler-cache",
    locationId: "yacht",
    title: "Vorbereitung statt Improvisation",
    description: "Im Servicefach ist Platz für eine dauerhafte Kühl- und Notfallausrüstung.",
    actionLabel: "Ausrüstung für $ 150 deponieren",
    resultText: "Kühlbox und Notfallset warten künftig direkt am Anleger.",
    effects: { cash: -150 },
    requiredFlags: [],
    requiredDiscoveries: [],
    minimumMissions: 1,
    completionFlags: ["yacht_supply_cache"],
    visual: {
      icon: "▣",
      sceneLabel: "Servicefach",
      x: 73,
      y: 69,
      tone: "green",
    },
  },
  {
    id: "villa-foundation-plan",
    locationId: "villa",
    title: "Der alte Fundamentplan",
    description: "Hinter einem losen Wandpaneel steckt ein Plan der Klippenfundamente.",
    actionLabel: "Plan sichern",
    resultText: "Unter deiner Parzelle ist ein alter, zugänglicher Hohlraum eingezeichnet.",
    effects: {},
    requiredFlags: [],
    requiredDiscoveries: [],
    minimumMissions: 3,
    discoveryId: "hidden_foundation_plan",
    completionFlags: ["midnight_foundation_known"],
    visual: {
      icon: "⌕",
      sceneLabel: "Lose Verkleidung",
      x: 27,
      y: 63,
      tone: "violet",
    },
  },
  {
    id: "villa-guest-pattern",
    locationId: "villa",
    title: "Wer kommt durch welche Tür?",
    description: "Haupteingang, Serviceweg und Terrasse erzählen drei verschiedene Geschichten.",
    actionLabel: "Ankünfte beobachten",
    resultText: "Du erkennst, wie diskrete Gäste die Villa betreten, ohne gesehen zu werden.",
    effects: { trust: 2 },
    characterId: "mia",
    requiredFlags: ["lola_slice_finished"],
    requiredDiscoveries: [],
    minimumMissions: 3,
    discoveryId: "villa_discreet_entry",
    visual: {
      icon: "◈",
      sceneLabel: "Drei Zugänge",
      x: 74,
      y: 48,
      tone: "amber",
    },
  },
  {
    id: "club-vip-door",
    locationId: "club",
    title: "Die Tür ohne Schild",
    description: "Eine Seitentür öffnet sich nur, wenn der richtige Wagen vorfährt.",
    actionLabel: "Ablauf beobachten",
    resultText: "Du kennst jetzt den Zugang zum späteren VIP-Bereich.",
    effects: { fans: 80, heat: 2 },
    requiredFlags: [],
    requiredDiscoveries: [],
    minimumMissions: 3,
    discoveryId: "club_vip_door",
    completionFlags: ["club_vip_access_known"],
    visual: {
      icon: "◇",
      sceneLabel: "Seitentür",
      x: 77,
      y: 46,
      tone: "pink",
    },
  },
  {
    id: "club-quiet-booth",
    locationId: "club",
    title: "Die stille Nische",
    description: "Hinter dem DJ-Bereich liegt eine schallgedämpfte Sitzecke.",
    actionLabel: "Nische für $ 100 reservieren",
    resultText: "Du hast künftig einen ruhigen Treffpunkt mitten im Club.",
    effects: { cash: -100, heat: -3 },
    requiredFlags: [],
    requiredDiscoveries: ["club_vip_door"],
    minimumMissions: 3,
    completionFlags: ["club_quiet_booth_reserved"],
    visual: {
      icon: "◒",
      sceneLabel: "Stille Nische",
      x: 31,
      y: 63,
      tone: "violet",
    },
  },
  {
    id: "bar-bartender-rumor",
    locationId: "bar",
    title: "Der Barkeeper hört alles",
    description: "Am Service-Dock soll nachts eine Kiste ankommen, die niemand bestellt hat.",
    actionLabel: "Ein alkoholfreies Getränk ausgeben",
    resultText: "Du kennst Zeit und Platz der nicht eingetragenen Lieferung.",
    effects: { cash: -50 },
    requiredFlags: [],
    requiredDiscoveries: [],
    minimumMissions: 2,
    discoveryId: "dock_night_delivery",
    completionFlags: ["dock_delivery_tip"],
    visual: {
      icon: "♢",
      sceneLabel: "Barkeeper",
      x: 36,
      y: 47,
      tone: "amber",
    },
  },
  {
    id: "bar-lay-low",
    locationId: "bar",
    title: "Aus dem Licht bleiben",
    description: "Der hintere Tisch ist teuer, aber von der Straße nicht einsehbar.",
    actionLabel: "Hinteren Tisch für $ 200 nehmen",
    resultText: "Die Insel verliert den Runner für eine Weile aus den Augen.",
    effects: { cash: -200, heat: -8 },
    requiredFlags: [],
    requiredDiscoveries: [],
    minimumMissions: 1,
    visual: {
      icon: "◐",
      sceneLabel: "Hinterer Tisch",
      x: 72,
      y: 63,
      tone: "green",
    },
  },
  {
    id: "dock-sealed-crate",
    locationId: "dock",
    title: "Die Kiste ohne Frachtcode",
    description: "Sie steht genau dort, wo der Barkeeper sie angekündigt hat.",
    actionLabel: "Siegel prüfen",
    resultText: "Das Siegel trägt dasselbe geometrische Zeichen wie Mias Umschlag.",
    effects: {},
    requiredFlags: [],
    requiredDiscoveries: ["dock_night_delivery"],
    minimumMissions: 2,
    discoveryId: "mia_crate_symbol",
    completionFlags: ["mia_crate_symbol_known"],
    visual: {
      icon: "⬡",
      sceneLabel: "Fremdes Siegel",
      x: 67,
      y: 61,
      tone: "violet",
    },
  },
  {
    id: "dock-runner-kit",
    locationId: "dock",
    title: "Runner-Vorräte",
    description: "Eine kleine, anonyme Servicekiste spart bei späteren Fahrten Zeit.",
    actionLabel: "Vorräte für $ 250 einlagern",
    resultText: "Werkzeug, Wasser und Ersatztelefon liegen künftig am Service-Dock.",
    effects: { cash: -250 },
    requiredFlags: [],
    requiredDiscoveries: [],
    minimumMissions: 1,
    completionFlags: ["dock_runner_cache"],
    visual: {
      icon: "▣",
      sceneLabel: "Freie Kiste",
      x: 27,
      y: 69,
      tone: "cyan",
    },
  },
] as const;

export function activitiesForLocation(
  locationId: LocationId,
): readonly LocationActivityDefinition[] {
  if (locationId === "runner-home") return [];
  return LOCATION_ACTIVITIES.filter(
    (activity) => activity.locationId === locationId,
  );
}

export function getLocationActivity(id: string): LocationActivityDefinition {
  const activity = LOCATION_ACTIVITIES.find((candidate) => candidate.id === id);
  if (!activity) throw new Error(`Unknown location activity: ${id}`);
  return activity;
}
