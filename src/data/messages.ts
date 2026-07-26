import type { MessageDefinition } from "../core/types";

export const MESSAGES: MessageDefinition[] = [
  {
    id: "lola-intro",
    characterId: "lola",
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
    characterId: "lola",
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
    characterId: "lola",
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
    characterId: "lola",
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
  {
    id: "mia-intro",
    characterId: "mia",
    sender: "Mia",
    preview: "Lola sagt, du kannst diskret sein.",
    body: [
      "Lola sagt, du kannst diskret sein.",
      "Ich brauche eine Fahrt von der Villa zum Club. Ein versiegelter Umschlag kommt mit. Keine Fotos, keine Namen.",
    ],
    requiredFlags: ["lola_slice_finished"],
    replies: [
      {
        id: "mia-intro-discreet",
        label: "Schick mir nur Zeit und Treffpunkt.",
        hint: "Diskret",
        effects: { trust: 5, mood: 1 },
        flags: ["mia_documents_confirmed", "mia_plan_discreet"],
        response: ["22:55. Obere Villa.", "Wenn du zu früh bist, wartest du. Wenn du zu spät bist, gehst du."],
      },
      {
        id: "mia-intro-careful",
        label: "Wer darf wissen, dass du im Wagen sitzt?",
        hint: "Vorausschauend",
        effects: { trust: 4, attraction: 1 },
        flags: ["mia_documents_confirmed", "mia_plan_careful"],
        response: ["Im Moment nur du.", "Villa. Und lass das Telefon im Wagen besser leise."],
      },
      {
        id: "mia-intro-direct",
        label: "Diskretion kostet. Ich bin trotzdem da.",
        hint: "Geschäftlich",
        effects: { cash: 150, trust: 2 },
        flags: ["mia_documents_confirmed", "mia_plan_paid"],
        response: ["Direkt. Gut.", "Das Honorar stimmt, wenn du auch den Rest ernst nimmst."],
      },
    ],
  },
  {
    id: "mia-after-documents",
    characterId: "mia",
    sender: "Mia",
    preview: "Die Übergabe war sauber. Wegen deines Hauses …",
    body: [
      "Die Übergabe war sauber.",
      "Wegen deines Hauses an der Klippe: Dort lässt sich vermutlich ruhiger reden als im Club.",
    ],
    requiredFlags: ["mia_documents_complete"],
    replies: [
      {
        id: "mia-home-private",
        label: "Komm allein vorbei. Ich halte die Veranda frei.",
        hint: "Privat",
        effects: { attraction: 4, mood: 3 },
        flags: ["mia_home_scene_pending", "mia_home_invite_private"],
        response: ["Allein ist gut.", "Ich bin in zwanzig Minuten da."],
        social: {
          memories: [
            {
              id: "mia_private_invite_confirmed",
              title: "Private Einladung",
              description: "Mia hat eine Einladung angenommen, von der Lola nichts weiß.",
              tone: "private",
              knownBy: ["mia"],
            },
          ],
        },
      },
      {
        id: "mia-home-open",
        label: "Lola kann dazukommen. Keine Geheimnisse.",
        hint: "Offen",
        effects: { trust: 4, mood: 1 },
        flags: ["mia_home_scene_pending", "mia_home_invite_open"],
        response: ["Ungewöhnlich vernünftig.", "Ich komme trotzdem zuerst. Lola meldet sich später."],
        social: {
          friendship: 3,
          tension: -2,
          memories: [
            {
              id: "mia_open_invite",
              title: "Offene Einladung",
              description: "Du hast Mia ausdrücklich gesagt, dass Lola ebenfalls willkommen ist.",
              tone: "honest",
              knownBy: ["mia"],
            },
          ],
        },
      },
      {
        id: "mia-home-business",
        label: "Nur geschäftlich. Bring die Unterlagen mit.",
        hint: "Professionell",
        effects: { trust: 5 },
        flags: ["mia_home_scene_pending", "mia_home_invite_business"],
        response: ["Verstanden.", "Dann nennen wir es eine Nachbesprechung."],
        social: {
          memories: [
            {
              id: "mia_business_visit",
              title: "Nachbesprechung im Bungalow",
              description: "Du hast Mias Besuch ausdrücklich geschäftlich gehalten.",
              tone: "professional",
              knownBy: ["mia"],
            },
          ],
        },
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
