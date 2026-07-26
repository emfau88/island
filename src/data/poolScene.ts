import type {
  CharacterId,
  Effects,
  Reaction,
  SocialConsequences,
} from "../core/types";

export type PoolSceneActorId = CharacterId | "group";

export interface PoolSceneInteractionDefinition {
  id: string;
  actorId: PoolSceneActorId;
  title: string;
  label: string;
  prompt: string;
  result: string;
  reaction: Reaction;
  effects: Partial<Effects>;
  minimumMissions: number;
  requiredFlags: string[];
  completionFlags: string[];
  social?: SocialConsequences;
}

export const POOL_SCENE_INTERACTIONS: readonly PoolSceneInteractionDefinition[] = [
  {
    id: "pool-lola-breathe",
    actorId: "lola",
    title: "Ein Moment ohne Auftrag",
    label: "Bei Lola bleiben",
    prompt: "Lola wartet am Beckenrand und beobachtet, ob du diesmal ohne Auftrag Zeit für sie hast.",
    result: "Ihr lasst das Geschäft für einen Moment ruhen. Lola merkt sich, dass du geblieben bist.",
    reaction: "positive",
    effects: { attraction: 1, trust: 2, mood: 4 },
    minimumMissions: 1,
    requiredFlags: ["lola_cocktail_complete"],
    completionFlags: ["pool_lola_met"],
    social: {
      memories: [
        {
          id: "pool_evening_with_lola",
          title: "Eine ruhige Minute am Pool",
          description: "Du bist nach dem Auftrag bei Lola geblieben, ohne etwas von ihr zu verlangen.",
          tone: "warm",
          knownBy: ["lola"],
        },
      ],
    },
  },
  {
    id: "pool-lola-about-mia",
    actorId: "lola",
    title: "Mias Name fällt",
    label: "Offen nach Mia fragen",
    prompt: "Lola hat längst bemerkt, dass ein neuer Kontakt auf deinem Smartphone aufgetaucht ist.",
    result: "Du weichst nicht aus. Lola schätzt die Offenheit, beobachtet Mia jetzt aber genauer.",
    reaction: "serious",
    effects: { trust: 2, mood: -1 },
    minimumMissions: 3,
    requiredFlags: ["lola_slice_finished"],
    completionFlags: ["pool_lola_asked_about_mia"],
    social: {
      tension: 3,
      memories: [
        {
          id: "lola_knows_mia_contacted_runner",
          title: "Mias Name am Pool",
          description: "Du hast Lola offen gesagt, dass Mia Kontakt zu dir aufgenommen hat.",
          tone: "honest",
          knownBy: ["lola"],
        },
      ],
    },
  },
  {
    id: "pool-mia-debrief",
    actorId: "mia",
    title: "Nachbesprechung am Wasser",
    label: "Mia zuhören",
    prompt: "Mia steht abseits vom Licht. Sie will wissen, was du aus dem Villa-Auftrag verstanden hast.",
    result: "Du lässt sie ausreden und fragst erst danach nach. Das registriert Mia sehr genau.",
    reaction: "positive",
    effects: { trust: 3, mood: 2 },
    minimumMissions: 4,
    requiredFlags: ["mia_documents_complete"],
    completionFlags: ["pool_mia_met"],
    social: {
      memories: [
        {
          id: "mia_pool_debrief",
          title: "Mias Nachbesprechung",
          description: "Mia hat dir am Pool mehr über die Villa erzählt als geplant.",
          tone: "private",
          knownBy: ["mia"],
        },
      ],
    },
  },
  {
    id: "pool-mia-about-lola",
    actorId: "mia",
    title: "Keine Geheimnisse am Beckenrand",
    label: "Lola ausdrücklich erwähnen",
    prompt: "Mia fragt nicht direkt nach Lola. Genau deshalb wäre es leicht, sie aus dem Gespräch zu lassen.",
    result: "Du machst Lola nicht zum blinden Fleck. Zwischen den beiden sinkt die Spannung ein wenig.",
    reaction: "serious",
    effects: { trust: 2, mood: 1 },
    minimumMissions: 4,
    requiredFlags: ["mia_home_visit_complete"],
    completionFlags: ["pool_mia_lola_open"],
    social: {
      friendship: 4,
      tension: -2,
      memories: [
        {
          id: "mia_pool_lola_transparency",
          title: "Lola blieb Teil des Gesprächs",
          description: "Du hast am Pool offen über Lola gesprochen, obwohl sie nicht dabei war.",
          tone: "honest",
          knownBy: ["mia"],
        },
      ],
    },
  },
  {
    id: "pool-group-toast",
    actorId: "group",
    title: "Drei Gläser, kein Auftrag",
    label: "Gemeinsam anstoßen",
    prompt: "Lola und Mia sind gleichzeitig hier. Für einen seltenen Moment wartet kein Auftrag.",
    result: "Das Gespräch bleibt vorsichtig, aber niemand geht. Aus Konkurrenz wird erstmals echte Neugier.",
    reaction: "positive",
    effects: {},
    minimumMissions: 4,
    requiredFlags: ["pool_lola_met", "pool_mia_met"],
    completionFlags: ["pool_group_evening_complete"],
    social: {
      friendship: 5,
      tension: -3,
      relationships: {
        lola: { mood: 3 },
        mia: { mood: 3 },
      },
      memories: [
        {
          id: "pool_first_group_evening",
          title: "Der erste gemeinsame Abend",
          description: "Lola und Mia sind am Pool geblieben, obwohl beide jederzeit ein eigenes Gespräch hätten führen können.",
          tone: "warm",
          knownBy: ["lola", "mia"],
        },
      ],
    },
  },
] as const;
