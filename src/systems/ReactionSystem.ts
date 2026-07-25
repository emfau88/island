import { preloadReaction, reactionAsset } from "../core/AssetManager";
import type { Reaction } from "../core/types";

export class CharacterReactionController {
  public constructor(private readonly image: HTMLImageElement) {}

  public async setCharacterReaction(reaction: Reaction): Promise<void> {
    await preloadReaction(reaction);
    this.image.classList.add("is-switching");
    await new Promise((resolve) => window.setTimeout(resolve, 130));
    this.image.src = reactionAsset(reaction);
    this.image.dataset.reaction = reaction;
    await this.image.decode();
    this.image.classList.remove("is-switching");
  }
}
