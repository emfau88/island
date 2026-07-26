import type { MissionDefinition } from "../core/types";

export const MISSIONS: MissionDefinition[] = [
  {
    id: "lola-cocktail-01",
    characterId: "lola",
    title: "Cocktail-Kurier",
    summary: "Lola samt Spezial-Cocktail vom Pool zum Yacht-Dock bringen.",
    startLocation: "pool",
    destination: "yacht",
    requirements: {
      requiredFlags: ["onboarding_complete"],
      forbiddenFlags: ["lola_cocktail_complete"],
    },
    routeIds: ["pool-yacht-coast", "pool-yacht-service"],
    pickupPrompt: "Da bist du ja. Was hast du für mich?",
    pickupChoices: [
      {
        id: "cocktail-ready",
        label: "Cocktail kalt. Wagen bereit.",
        hint: "Zuverlässig",
        reaction: "positive",
        effects: { trust: 4, mood: 3 },
      },
      {
        id: "special-delivery",
        label: "Eine besondere Lieferung – mit Chauffeur.",
        hint: "Charmant",
        reaction: "flirty",
        effects: { attraction: 5, mood: 2 },
      },
      {
        id: "why-no-service",
        label: "Warum auf keinen Fall der Serviceweg?",
        hint: "Neugierig",
        reaction: "serious",
        effects: { trust: 2, mood: -1 },
      },
    ],
    travelEvent: {
      title: "Kontrolle voraus",
      prompt: "Die Hotelzufahrt ist gesperrt. Security winkt deinen Wagen heraus.",
      triggerProgress: 0.28,
      choices: [
        {
          id: "show-pass",
          label: "Pass zeigen und ruhig bleiben.",
          hint: "Diskret",
          reaction: "positive",
          effects: { trust: 4, heat: -1 },
        },
        {
          id: "lola-talks",
          label: "Lola übernimmt das Gespräch.",
          hint: "Teamwork",
          reaction: "flirty",
          effects: { attraction: 4, mood: 3 },
        },
        {
          id: "vip-lane",
          label: "Durch die VIP-Spur ziehen.",
          hint: "Riskant",
          reaction: "surprised",
          effects: { cash: 150, fans: 60, heat: 4 },
        },
      ],
    },
    encounterPrompt: "Du bist wirklich schnell. Gefällt mir. Was nun?",
    arrivalPrompts: {
      "pool-yacht-coast": "Die Aussicht war die Extra-Minute wert. Was nun?",
      "pool-yacht-service": "Schnell, laut und gerade noch sauber. Was nun?",
    },
    encounterChoices: [
      {
        id: "stay-a-while",
        label: "Cocktail übergeben und ein bisschen bleiben.",
        hint: "Nähe",
        reaction: "flirty",
        effects: { attraction: 7, mood: 4, heat: 1 },
      },
      {
        id: "direct-return",
        label: "Cocktail übergeben und diskret zurück.",
        hint: "Verlässlich",
        reaction: "positive",
        effects: { trust: 6, attraction: 1 },
      },
      {
        id: "ask-yacht",
        label: "Nach der nächsten Yacht-Runde fragen.",
        hint: "Selbstbewusst",
        reaction: "surprised",
        effects: { attraction: 4, heat: 3, mood: 2 },
      },
    ],
    rewards: { cash: 2_500, fans: 250 },
    completionFlags: ["lola_cocktail_complete"],
    followUpMessageId: "lola-after-cocktail",
  },
  {
    id: "lola-ice-02",
    characterId: "lola",
    title: "Mitternachts-Eis",
    summary: "Vom Yacht-Dock zurück zum Pool – bevor die Drinks warm werden.",
    startLocation: "yacht",
    destination: "pool",
    requirements: {
      requiredFlags: ["lola_cocktail_complete", "lola_ice_confirmed"],
      forbiddenFlags: ["lola_ice_complete"],
    },
    routeIds: ["yacht-pool-coast", "yacht-pool-service"],
    pickupPrompt: "Das Eis wartet. Meine Geduld eher nicht.",
    pickupChoices: [
      {
        id: "cooler-ready",
        label: "Kühlbox steht schon im Wagen.",
        hint: "Vorausschauend",
        reaction: "positive",
        effects: { trust: 5, mood: 3 },
      },
      {
        id: "no-melting",
        label: "Bei mir schmilzt heute gar nichts.",
        hint: "Locker",
        reaction: "flirty",
        effects: { attraction: 4, mood: 2 },
      },
      {
        id: "deadline",
        label: "Wie knapp ist das Zeitfenster wirklich?",
        hint: "Präzise",
        reaction: "serious",
        effects: { trust: 3, mood: -1 },
      },
    ],
    travelEvent: {
      title: "Kühlkette",
      prompt: "Die Kühlbox meldet 4 °C. Noch zwei Grad bis zum Problem.",
      triggerProgress: 0.32,
      choices: [
        {
          id: "max-cooling",
          label: "Klimaanlage maximal, Tempo halten.",
          hint: "Sicher",
          reaction: "positive",
          effects: { cash: -100, trust: 5, mood: 1 },
        },
        {
          id: "club-shortcut",
          label: "Abkürzung durch die Clubzufahrt.",
          hint: "Schnell",
          reaction: "surprised",
          effects: { fans: 50, heat: 4, trust: 3 },
        },
        {
          id: "lola-checks-ice",
          label: "Lola kontrolliert das Eis während der Fahrt.",
          hint: "Nähe",
          reaction: "flirty",
          effects: { attraction: 4, mood: 4, trust: -1 },
        },
      ],
    },
    encounterPrompt: "Noch gefroren. Ich bin beeindruckt – ein bisschen.",
    arrivalPrompts: {
      "yacht-pool-coast": "Knapp, aber noch gefroren. Die Aussicht schuldest du mir trotzdem.",
      "yacht-pool-service": "Noch gefroren – der Serviceweg hatte heute einen Sinn.",
    },
    encounterChoices: [
      {
        id: "take-credit",
        label: "Ich nehme das Kompliment trotzdem.",
        hint: "Selbstbewusst",
        reaction: "flirty",
        effects: { attraction: 5, mood: 3 },
      },
      {
        id: "check-cooler",
        label: "Erst prüfen, dann feiern.",
        hint: "Zuverlässig",
        reaction: "positive",
        effects: { trust: 6, mood: 1 },
      },
      {
        id: "ask-tip",
        label: "Und wie sieht beeindrucktes Trinkgeld aus?",
        hint: "Frech",
        reaction: "surprised",
        effects: { cash: 300, attraction: 2, heat: 2 },
      },
    ],
    rewards: { cash: 1_800, fans: 180 },
    completionFlags: ["lola_ice_complete"],
    followUpMessageId: "lola-after-ice",
  },
  {
    id: "lola-playlist-03",
    characterId: "lola",
    title: "Die private Playlist",
    summary: "Lolas Telefon vom Pool holen und persönlich ans Yacht-Dock bringen.",
    startLocation: "pool",
    destination: "yacht",
    requirements: {
      requiredFlags: ["lola_ice_complete", "lola_playlist_confirmed"],
      forbiddenFlags: ["lola_playlist_complete"],
    },
    routeIds: ["pool-yacht-coast", "pool-yacht-service"],
    pickupPrompt: "Das ist nicht irgendein Telefon. Keine neugierigen Finger.",
    pickupChoices: [
      {
        id: "sealed-pouch",
        label: "Es bleibt versiegelt bis zur Übergabe.",
        hint: "Diskret",
        reaction: "positive",
        effects: { trust: 7, mood: 2 },
      },
      {
        id: "taste-question",
        label: "Ich beurteile nur deinen Musikgeschmack.",
        hint: "Frech",
        reaction: "flirty",
        effects: { attraction: 4, mood: 3 },
      },
      {
        id: "notifications",
        label: "Benachrichtigungen sind bereits stumm.",
        hint: "Professionell",
        reaction: "surprised",
        effects: { trust: 5, attraction: 1 },
      },
    ],
    travelEvent: {
      title: "Privatsphäre",
      prompt: "Auf Lolas Telefon blinkt eine private Nachricht auf. Du hast nichts gesehen, richtig?",
      triggerProgress: 0.36,
      choices: [
        {
          id: "eyes-road",
          label: "Meine Augen sind auf der Straße.",
          hint: "Diskret",
          reaction: "positive",
          effects: { trust: 6, mood: 2 },
        },
        {
          id: "only-name",
          label: "Nur den Namen. Mehr nicht.",
          hint: "Ehrlich",
          reaction: "serious",
          effects: { trust: 2, mood: -1 },
        },
        {
          id: "tease-secret",
          label: "Dein Geheimnis klingt nach guter Musik.",
          hint: "Riskant",
          reaction: "annoyed",
          effects: { trust: -4, attraction: 2, heat: 3 },
        },
      ],
    },
    encounterPrompt: "Alles noch versiegelt. Vielleicht kann ich dir wirklich vertrauen.",
    arrivalPrompts: {
      "pool-yacht-coast": "Alles versiegelt. Du weißt offenbar, wann Ruhe wertvoll ist.",
      "pool-yacht-service": "Schnell angekommen. Jetzt zählt nur, ob wirklich alles versiegelt ist.",
    },
    encounterChoices: [
      {
        id: "trust-matters",
        label: "Vertrauen ist mehr wert als Neugier.",
        hint: "Verlässlich",
        reaction: "positive",
        effects: { trust: 8, attraction: 2 },
      },
      {
        id: "favorite-runner",
        label: "Dann sag es: Lieblings-Runner.",
        hint: "Charmant",
        reaction: "flirty",
        effects: { attraction: 7, mood: 4 },
      },
      {
        id: "one-track",
        label: "Ein Song als Trinkgeld reicht.",
        hint: "Spielerisch",
        reaction: "surprised",
        effects: { attraction: 4, trust: 3, fans: 100 },
      },
    ],
    rewards: { cash: 3_200, fans: 350 },
    completionFlags: ["lola_playlist_complete"],
    followUpMessageId: "lola-after-playlist",
  },
  {
    id: "mia-documents-01",
    characterId: "mia",
    title: "Vertrauliche Übergabe",
    summary: "Mia und ein versiegeltes Dokument unbemerkt von der Villa zum Club bringen.",
    startLocation: "villa",
    destination: "club",
    requirements: {
      requiredFlags: ["mia_documents_confirmed"],
      forbiddenFlags: ["mia_documents_complete"],
    },
    routeIds: ["villa-club-terraces", "villa-club-promenade"],
    pickupPrompt: "Der Umschlag bleibt zu. Und mein Name fällt heute Abend nirgends.",
    pickupChoices: [
      {
        id: "mia-sealed-case",
        label: "Versiegelt bis zur persönlichen Übergabe.",
        hint: "Diskret",
        reaction: "positive",
        effects: { trust: 7, mood: 2 },
      },
      {
        id: "mia-verify-recipient",
        label: "Ich brauche nur ein Erkennungswort für den Empfänger.",
        hint: "Vorsichtig",
        reaction: "serious",
        effects: { trust: 5, mood: 1, heat: -1 },
      },
      {
        id: "mia-no-questions",
        label: "Keine Namen, keine Fragen.",
        hint: "Professionell",
        reaction: "positive",
        effects: { trust: 4, attraction: 2 },
      },
    ],
    travelEvent: {
      title: "Lolas Anruf",
      prompt: "Lola ruft an. Mia sieht den Namen auf deinem Display und wartet auf deine Reaktion.",
      triggerProgress: 0.42,
      choices: [
        {
          id: "mia-call-transparent",
          label: "Lola kurz schreiben: „Fahre gerade Mia.“",
          hint: "Transparent",
          reaction: "positive",
          effects: { trust: 5, mood: 1 },
          social: {
            relationships: {
              lola: { trust: 1, mood: -1 },
            },
            friendship: 1,
            tension: 1,
            memories: [
              {
                id: "transparent_lola_call",
                title: "Offene Karten im Wagen",
                description: "Du hast Lola offen gesagt, dass Mia bei dir im Wagen saß.",
                tone: "honest",
                knownBy: ["lola", "mia"],
              },
            ],
          },
        },
        {
          id: "mia-call-silence",
          label: "Den Anruf kommentarlos stumm schalten.",
          hint: "Diskret",
          reaction: "serious",
          effects: { trust: 3, mood: 1 },
          social: {
            relationships: {
              lola: { attraction: -1, mood: -4 },
            },
            tension: 3,
            memories: [
              {
                id: "mia_saw_ignored_call",
                title: "Der weggedrückte Anruf",
                description: "Mia hat gesehen, wie du Lolas Anruf für ihren Auftrag ignoriert hast.",
                tone: "tense",
                knownBy: ["mia"],
              },
              {
                id: "lola_call_ignored",
                title: "Nicht rangegangen",
                description: "Lola weiß, dass du ihren Anruf weggedrückt hast – aber nicht warum.",
                tone: "tense",
                knownBy: ["lola"],
              },
            ],
          },
        },
        {
          id: "mia-call-boundary",
          label: "Mia fragen, ob du kurz rangehen sollst.",
          hint: "Respektvoll",
          reaction: "positive",
          effects: { trust: 4, attraction: 2, mood: 2 },
          social: {
            tension: -1,
            memories: [
              {
                id: "mia_boundary_respected",
                title: "Grenzen respektiert",
                description: "Du hast Mia in einer heiklen Situation entscheiden lassen.",
                tone: "warm",
                knownBy: ["mia"],
              },
            ],
          },
        },
      ],
    },
    encounterPrompt: "Niemand hat uns aufgehalten. Jetzt zeigt sich, ob du auch beim letzten Meter diskret bleibst.",
    arrivalPrompts: {
      "villa-club-terraces": "Keine Kameras, keine Fragen. Der Terrassenweg war die richtige Wahl.",
      "villa-club-promenade": "Schnell waren wir. Unbemerkt eher nicht. Bring es jetzt sauber zu Ende.",
    },
    encounterChoices: [
      {
        id: "mia-document-first",
        label: "Erst die Übergabe bestätigen lassen, dann gehen.",
        hint: "Zuverlässig",
        reaction: "positive",
        effects: { trust: 8, mood: 2 },
      },
      {
        id: "mia-ask-context",
        label: "Was habe ich da gerade eigentlich geschützt?",
        hint: "Persönlich",
        reaction: "serious",
        effects: { trust: 3, attraction: 3, mood: 1 },
      },
      {
        id: "mia-offer-home",
        label: "Wenn du danach Ruhe brauchst: mein Bungalow.",
        hint: "Einladung",
        reaction: "positive",
        effects: { attraction: 6, mood: 4 },
        flags: ["mia_home_offer_made"],
        social: {
          memories: [
            {
              id: "mia_bungalow_offer",
              title: "Ein Angebot nach Mitternacht",
              description: "Du hast Mia nach dem Auftrag in deinen Bungalow eingeladen.",
              tone: "private",
              knownBy: ["mia"],
            },
          ],
        },
      },
    ],
    rewards: { cash: 2_800, fans: 120 },
    completionFlags: ["mia_documents_complete"],
    followUpMessageId: "mia-after-documents",
  },
];

export function getMission(id: string): MissionDefinition {
  const mission = MISSIONS.find((candidate) => candidate.id === id);
  if (!mission) {
    throw new Error(`Unknown mission: ${id}`);
  }
  return mission;
}
