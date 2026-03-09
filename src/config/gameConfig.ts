import type { GameConfig } from "../types";

export const GAME_CONFIG: GameConfig = {
  canvas: {
    width: 960,
    height: 360
  },
  world: {
    groundY: 288
  },
  physics: {
    gravity: 2600,
    jumpVelocity: -860
  },
  runner: {
    initialSpeed: 320,
    acceleration: 15,
    maxSpeed: 760,
    scorePerPixel: 0.09
  },
  player: {
    startX: 120,
    width: 44,
    height: 50,
    crouchWidth: 58,
    crouchHeight: 30,
    intangibleMaxSeconds: 0.95,
    intangibleRecoveryPerSecond: 0.55,
    warningThreshold: 0.68
  },
  spawn: {
    spawnPaddingX: 36,
    intervalMinStart: 0.95,
    intervalMaxStart: 1.6,
    intervalMinEnd: 0.45,
    intervalMaxEnd: 0.86,
    comboChanceMin: 0.14,
    comboChanceMax: 0.42,
    comboSpacingMin: 28,
    comboSpacingMax: 76
  },
  difficulty: {
    rampSeconds: 90
  },
  collision: {
    padding: 3
  },
  visual: {
    degradationMaxDropout: 0.93,
    degradationOpacityLoss: 0.5,
    warningPulseHz: 7,
    birdWingFlapHz: 10,
    windmillSpinRadPerSecond: 5.8
  },
  obstacles: {
    lowSmall: {
      width: 28,
      height: 44
    },
    lowLarge: {
      width: 52,
      height: 62
    },
    high: {
      width: 44,
      height: 94
    },
    bird: {
      width: 46,
      height: 34,
      groundClearance: 20
    },
    windmill: {
      width: 84,
      height: 86,
      groundClearance: 36
    }
  }
};
