import { preloadReaction, reactionAsset } from "../core/AssetManager";
import type { CharacterId, Reaction } from "../core/types";

export class CharacterReactionController {
  public constructor(
    private readonly image: HTMLImageElement,
    private readonly characterId: CharacterId = "lola",
  ) {}

  public async setCharacterReaction(reaction: Reaction): Promise<void> {
    await preloadReaction(reaction, this.characterId);
    this.image.classList.add("is-switching");
    await new Promise((resolve) => window.setTimeout(resolve, 130));
    this.image.src = reactionAsset(reaction, this.characterId);
    this.image.dataset.reaction = reaction;
    await this.image.decode();
    this.image.classList.remove("is-switching");
  }
}
