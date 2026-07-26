import type { Choice } from "../core/types";

export const MIA_HOME_VISIT_CHOICES: readonly Choice[] = [
  {
    id: "mia-home-listen",
    label: "Mia erst einmal zuhören.",
    hint: "Freundschaft",
    reaction: "positive",
    effects: { trust: 6, mood: 3 },
    flags: ["mia_home_visit_complete", "mia_home_bond_friend"],
    social: {
      memories: [
        {
          id: "mia_confided_at_bungalow",
          title: "Ein ruhiges Gespräch",
          description: "Mia hat dir im Bungalow etwas Persönliches anvertraut.",
          tone: "warm",
          knownBy: ["mia"],
        },
      ],
    },
  },
  {
    id: "mia-home-transparent",
    label: "Offen über Lolas Anruf sprechen.",
    hint: "Ehrlich",
    reaction: "serious",
    effects: { trust: 5, mood: 1 },
    flags: ["mia_home_visit_complete", "mia_home_bond_honest"],
    social: {
      friendship: 2,
      tension: -3,
      memories: [
        {
          id: "mia_home_call_transparency",
          title: "Keine halben Wahrheiten",
          description: "Du hast beim privaten Treffen offen über Lola gesprochen.",
          tone: "honest",
          knownBy: ["mia"],
        },
      ],
    },
  },
  {
    id: "mia-home-closer",
    label: "Den Abend persönlicher werden lassen.",
    hint: "Nähe",
    reaction: "positive",
    effects: { attraction: 7, mood: 5, trust: 1 },
    flags: ["mia_home_visit_complete", "mia_home_bond_close"],
    social: {
      memories: [
        {
          id: "mia_private_evening",
          title: "Ein privater Abend",
          description: "Mia und du seid euch im Bungalow nähergekommen. Lola weiß nichts davon.",
          tone: "private",
          knownBy: ["mia"],
        },
      ],
    },
  },
];
