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
  },
];

export function getMessage(id: string): MessageDefinition {
  const message = MESSAGES.find((candidate) => candidate.id === id);
  if (!message) {
    throw new Error(`Unknown message: ${id}`);
  }
  return message;
}
