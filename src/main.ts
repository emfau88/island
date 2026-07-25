import { Game } from "./core/Game";
import "./styles/main.css";

const root = document.querySelector<HTMLElement>("#app");
if (!root) {
  throw new Error("Missing #app root.");
}

const game = new Game(root);
void game.start();
