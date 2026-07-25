import type { MessageDefinition } from "../core/types";

export const MESSAGES: MessageDefinition[] = [
  {
    id: "lola-intro",
    sender: "Lola",
    preview: "Du bist doch der neue Runner, oder?",
    body: [
      "Du bist doch der neue Runner, oder?",
      "Am Pool wartet eine Cocktail-Lieferung. Bring sie zum Yacht-Dock – und mich gleich mit.",
    ],
    requiredFlags: [],
    replies: [
      {
        id: "intro-reliable",
        label: "Bin unterwegs. Wo treffen wir uns?",
        hint: "Zuverlässig",
        effects: { trust: 3, mood: 2 },
        flags: ["onboarding_complete"],
        response: ["Pool. Pinke Lichter, schwer zu übersehen.", "Und bring einen kalten Kopf mit."],
      },
      {
        id: "intro-business",
        label: "Kommt auf Auftrag und Bezahlung an.",
        hint: "Geschäftlich",
        effects: { cash: 100, trust: 1 },
        flags: ["onboarding_complete"],
        response: ["Direkt. Gefällt mir.", "2.500 – wenn der Cocktail kalt ankommt."],
      },
      {
        id: "intro-flirty",
        label: "Für dich? Sofort.",
        hint: "Charmant",
        effects: { attraction: 4, heat: 1 },
        flags: ["onboarding_complete"],
        response: ["Mutig für jemanden, den ich noch nicht kenne.", "Pool. Lass mich nicht warten."],
      },
    ],
  },
  {
    id: "lola-after-cocktail",
    sender: "Lola",
    preview: "Okay, das war besser als erwartet.",
    body: [
      "Okay, das war besser als erwartet.",
      "Ich brauche später Eis am Pool. Kein Drama, nur gutes Timing.",
    ],
    requiredFlags: ["lola_cocktail_complete"],
    replies: [
      {
        id: "ice-careful",
        label: "Ich bringe eine Kühlbox und Ruhe mit.",
        hint: "Vorausschauend",
        effects: { trust: 4, mood: 2, heat: -1 },
        flags: ["lola_ice_confirmed", "ice_plan_careful"],
        response: ["Perfekt. Yacht-Dock, sobald du bereit bist.", "Das Eis soll kalt bleiben. Ich auch."],
      },
      {
        id: "ice-fast",
        label: "Serviceweg. Das Eis merkt nicht mal die Fahrt.",
        hint: "Riskant",
        effects: { attraction: 3, heat: 3 },
        flags: ["lola_ice_confirmed", "ice_plan_fast"],
        response: ["Große Worte.", "Yacht-Dock. Beweis sie."],
      },
      {
        id: "ice-tip",
        label: "Für Nachtzuschlag bin ich offen.",
        hint: "Geschäftlich",
        effects: { cash: 150, attraction: 1 },
        flags: ["lola_ice_confirmed", "ice_plan_paid"],
        response: ["Wenn das Eis hält, reden wir über Trinkgeld.", "Hol mich am Yacht-Dock ab."],
      },
    ],
  },
  {
    id: "lola-after-ice",
    sender: "Lola",
    preview: "Das Timing war fast verdächtig gut.",
    body: [
      "Das Timing war fast verdächtig gut.",
      "Eine letzte Sache: meine private Playlist liegt noch am Pool. Du weißt, wo ich bin.",
    ],
    requiredFlags: ["lola_ice_complete"],
    replies: [
      {
        id: "playlist-discreet",
        label: "Versiegelt rein, versiegelt raus.",
        hint: "Diskret",
        effects: { trust: 5, mood: 2 },
        flags: ["lola_playlist_confirmed", "playlist_plan_discreet"],
        response: ["Genau die richtige Antwort.", "Pool. Und keine neugierigen Finger."],
      },
      {
        id: "playlist-tease",
        label: "Jetzt will ich den Musikgeschmack aber kennen.",
        hint: "Neugierig",
        effects: { attraction: 3, trust: -1 },
        flags: ["lola_playlist_confirmed", "playlist_plan_tease"],
        response: ["Neugier ist gefährlich auf dieser Insel.", "Aber komm zum Pool."],
      },
      {
        id: "playlist-professional",
        label: "Telefon aus. Auftrag an.",
        hint: "Professionell",
        effects: { trust: 4, heat: -1 },
        flags: ["lola_playlist_confirmed", "playlist_plan_professional"],
        response: ["Du lernst schnell.", "Treffpunkt Pool."],
      },
    ],
  },
  {
    id: "lola-after-playlist",
    sender: "Lola",
    preview: "Du bist jetzt offiziell mein Lieblings-Runner.",
    body: [
      "Du bist jetzt offiziell mein Lieblings-Runner.",
      "Die Insel merkt sich Leute, die wissen, wann sie schnell sein müssen – und wann nicht.",
    ],
    requiredFlags: ["lola_playlist_complete"],
    replies: [
      {
        id: "ending-loyal",
        label: "Dann bleibe ich dein Runner.",
        hint: "Loyal",
        effects: { trust: 6, mood: 4 },
        flags: ["lola_slice_finished", "ending_loyal"],
        response: ["Gut.", "Beim nächsten Anruf gehst du besser wieder ran."],
      },
      {
        id: "ending-flirty",
        label: "Lieblings-Runner klingt fast zu offiziell.",
        hint: "Charmant",
        effects: { attraction: 6, mood: 3 },
        flags: ["lola_slice_finished", "ending_flirty"],
        response: ["Fast.", "Den inoffiziellen Titel musst du dir noch verdienen."],
      },
      {
        id: "ending-business",
        label: "Lieblings-Runner hat hoffentlich VIP-Tarif.",
        hint: "Geschäftlich",
        effects: { cash: 250, fans: 100 },
        flags: ["lola_slice_finished", "ending_business"],
        response: ["Schon wieder die Bezahlung.", "Ich respektiere die Konsequenz."],
      },
    ],
  },
];

export function getMessage(id: string): MessageDefinition {
  const message = MESSAGES.find((candidate) => candidate.id === id);
  if (!message) {
    throw new Error(`Unknown message: ${id}`);
  }
  return message;
}
