export type GamePhase = "start" | "running" | "paused" | "gameover";

export type DeathCause = "collision" | "overheat";

export type ObstacleType =
  | "lowSmall"
  | "lowLarge"
  | "high"
  | "bird"
  | "windmill";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface InputSnapshot {
  jumpPressed: boolean;
  lowerHeld: boolean;
  intangibleHeld: boolean;
  pausePressed: boolean;
  startPressed: boolean;
  restartPressed: boolean;
  debugTogglePressed: boolean;
}

export interface ObstacleState extends Rect {
  id: number;
  type: ObstacleType;
}

export interface ObstacleConfig {
  width: number;
  height: number;
  groundClearance?: number;
}

export interface GameConfig {
  canvas: {
    width: number;
    height: number;
  };
  world: {
    groundY: number;
  };
  physics: {
    gravity: number;
    jumpVelocity: number;
  };
  runner: {
    initialSpeed: number;
    acceleration: number;
    maxSpeed: number;
    scorePerPixel: number;
  };
  player: {
    startX: number;
    width: number;
    height: number;
    crouchWidth: number;
    crouchHeight: number;
    intangibleMaxSeconds: number;
    intangibleRecoveryPerSecond: number;
    warningThreshold: number;
  };
  spawn: {
    spawnPaddingX: number;
    intervalMinStart: number;
    intervalMaxStart: number;
    intervalMinEnd: number;
    intervalMaxEnd: number;
    comboChanceMin: number;
    comboChanceMax: number;
    comboSpacingMin: number;
    comboSpacingMax: number;
  };
  difficulty: {
    rampSeconds: number;
  };
  collision: {
    padding: number;
  };
  visual: {
    degradationMaxDropout: number;
    degradationOpacityLoss: number;
    warningPulseHz: number;
    birdWingFlapHz: number;
    windmillSpinRadPerSecond: number;
  };
  obstacles: Record<ObstacleType, ObstacleConfig>;
}

export interface RuntimeGameState {
  phase: GamePhase;
  deathCause: DeathCause | null;
  elapsedSeconds: number;
  distance: number;
  speed: number;
  score: number;
  bestScore: number;
  debug: boolean;
}
