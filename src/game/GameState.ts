import { GAME_CONFIG } from "../config/gameConfig";
import type { RuntimeGameState } from "../types";

export const BEST_SCORE_KEY = "dino2.bestScore";

export function createInitialGameState(bestScore: number): RuntimeGameState {
  return {
    phase: "start",
    deathCause: null,
    elapsedSeconds: 0,
    distance: 0,
    speed: GAME_CONFIG.runner.initialSpeed,
    score: 0,
    bestScore,
    debug: false
  };
}

export function resetRunMetrics(state: RuntimeGameState): void {
  state.deathCause = null;
  state.elapsedSeconds = 0;
  state.distance = 0;
  state.speed = GAME_CONFIG.runner.initialSpeed;
  state.score = 0;
}

export function loadBestScore(): number {
  try {
    const raw = window.localStorage.getItem(BEST_SCORE_KEY);
    if (!raw) {
      return 0;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
  } catch {
    return 0;
  }
}

export function saveBestScore(score: number): void {
  try {
    window.localStorage.setItem(BEST_SCORE_KEY, String(Math.floor(score)));
  } catch {
    // Ignora erro de storage para manter o jogo funcional.
  }
}
