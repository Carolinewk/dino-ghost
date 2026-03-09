import "../style.css";
import { Game } from "./game/Game";

const canvas = document.querySelector<HTMLCanvasElement>("#game");

if (!canvas) {
  throw new Error("Canvas principal não encontrado.");
}

const game = new Game(canvas);
game.start();
