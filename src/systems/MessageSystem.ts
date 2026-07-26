import { getMessage } from "../data/messages";
import { syncUnlockedMessages } from "../core/SaveManager";
import { clamp, type SaveState } from "../core/types";
import { applyCharacterEffects, applySocialConsequences } from "./SocialSystem";

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

export class MessageSystem {
  public reply(state: SaveState, messageId: string, replyId: string, now = Date.now()): SaveState {
    const definition = getMessage(messageId);
    const reply = definition.replies.find((candidate) => candidate.id === replyId);
    const messageState = state.messages.find((message) => message.id === messageId);
    if (!reply || !messageState) {
      throw new Error(`Unknown message reply: ${messageId}/${replyId}`);
    }
    if (messageState.replyId) {
      return state;
    }

    let next: SaveState = {
      ...state,
      resources: {
        cash: Math.max(0, state.resources.cash + (reply.effects.cash ?? 0)),
        fans: Math.max(0, state.resources.fans + (reply.effects.fans ?? 0)),
        heat: clamp(state.resources.heat + (reply.effects.heat ?? 0)),
      },
      flags: unique([...state.flags, ...reply.flags]),
      messages: state.messages.map((message) =>
        message.id === messageId ? { ...message, read: true, replyId } : message,
      ),
      lastDecision: reply.label,
    };
    next = applyCharacterEffects(next, definition.characterId, reply.effects);
    next = applySocialConsequences(next, reply.social, now);
    return syncUnlockedMessages(next, now);
  }
}
