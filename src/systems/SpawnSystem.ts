import { Obstacle } from "../entities/Obstacle";
import type { GameConfig, ObstacleType } from "../types";
import { clamp, lerp, randomRange } from "../utils/math";

export class SpawnSystem {
  private static readonly MAX_CACTUS_STREAK = 3;
  private timerSeconds = 0;
  private nextObstacleId = 1;
  private cactusStreak = 0;

  constructor(private readonly config: GameConfig) {
    this.reset();
  }

  reset(): void {
    this.timerSeconds = this.pickInterval(0);
    this.nextObstacleId = 1;
    this.cactusStreak = 0;
  }

  update(
    dt: number,
    elapsedSeconds: number,
    speed: number,
    obstacles: Obstacle[]
  ): void {
    this.timerSeconds -= dt;

    const difficulty = clamp(
      elapsedSeconds / this.config.difficulty.rampSeconds,
      0,
      1
    );

    while (this.timerSeconds <= 0) {
      this.spawnPattern(difficulty, speed, obstacles);
      this.timerSeconds += this.pickInterval(difficulty);
    }
  }

  private spawnPattern(
    difficulty: number,
    speed: number,
    obstacles: Obstacle[]
  ): void {
    const comboChance = lerp(
      this.config.spawn.comboChanceMin,
      this.config.spawn.comboChanceMax,
      difficulty
    );
    const startX = this.config.canvas.width + this.config.spawn.spawnPaddingX;

    if (Math.random() < comboChance) {
      this.spawnCombo(startX, difficulty, speed, obstacles);
      return;
    }

    const canSpawnCactus =
      this.cactusStreak < SpawnSystem.MAX_CACTUS_STREAK;
    const type = this.pickSingleType(difficulty, canSpawnCactus);
    this.pushObstacle(type, startX, difficulty, obstacles);
  }

  private spawnCombo(
    startX: number,
    difficulty: number,
    speed: number,
    obstacles: Obstacle[]
  ): void {
    const count = Math.random() < 0.55 + difficulty * 0.2 ? 2 : 3;
    let cursorX = startX;

    for (let index = 0; index < count; index += 1) {
      const canSpawnCactus =
        this.cactusStreak < SpawnSystem.MAX_CACTUS_STREAK;
      const type = this.pickComboType(
        difficulty,
        index,
        count,
        canSpawnCactus
      );

      this.pushObstacle(type, cursorX, difficulty, obstacles);

      const spacingScale = clamp(560 / speed, 0.55, 1.3);
      const spacing =
        randomRange(
          this.config.spawn.comboSpacingMin,
          this.config.spawn.comboSpacingMax
        ) * spacingScale;
      cursorX += this.config.obstacles[type].width + spacing;
    }
  }

  private pickSingleType(
    difficulty: number,
    canSpawnCactus: boolean
  ): ObstacleType {
    if (!canSpawnCactus) {
      return Math.random() < 0.64 ? "bird" : "windmill";
    }

    const weights: Record<ObstacleType, number> = {
      lowSmall: lerp(0.28, 0.2, difficulty),
      lowLarge: lerp(0.22, 0.18, difficulty),
      high: lerp(0.14, 0.16, difficulty),
      bird: lerp(0.18, 0.24, difficulty),
      windmill: lerp(0.18, 0.22, difficulty)
    };

    const draw = Math.random();
    let cursor = 0;
    for (const type of [
      "lowSmall",
      "lowLarge",
      "high",
      "bird",
      "windmill"
    ] as const) {
      cursor += weights[type];
      if (draw <= cursor) {
        return type;
      }
    }

    return "bird";
  }

  private pickInterval(difficulty: number): number {
    const min = lerp(
      this.config.spawn.intervalMinStart,
      this.config.spawn.intervalMinEnd,
      difficulty
    );
    const max = lerp(
      this.config.spawn.intervalMaxStart,
      this.config.spawn.intervalMaxEnd,
      difficulty
    );
    return randomRange(min, max);
  }

  private pickComboType(
    difficulty: number,
    index: number,
    count: number,
    canSpawnCactus: boolean
  ): ObstacleType {
    if (!canSpawnCactus) {
      return index === count - 1 && Math.random() < 0.65 ? "bird" : "windmill";
    }

    if (
      index === 0 &&
      difficulty > 0.2 &&
      Math.random() < lerp(0.12, 0.22, difficulty)
    ) {
      return "windmill";
    }

    if (index === count - 1 && difficulty > 0.45 && Math.random() < 0.2) {
      return "bird";
    }

    const includeHigh =
      difficulty > 0.5 && index === count - 1 && Math.random() < 0.35;
    if (includeHigh) {
      return "high";
    }

    return Math.random() < 0.55 ? "lowSmall" : "lowLarge";
  }

  private pushObstacle(
    type: ObstacleType,
    x: number,
    difficulty: number,
    obstacles: Obstacle[]
  ): void {
    obstacles.push(this.createObstacle(type, x, difficulty));
    this.registerSpawn(type);
  }

  private createObstacle(
    type: ObstacleType,
    x: number,
    difficulty: number
  ): Obstacle {
    const spec = this.config.obstacles[type];
    const y = this.resolveObstacleY(type, spec.height, difficulty);
    return new Obstacle({
      id: this.nextObstacleId++,
      type,
      x,
      y,
      width: spec.width,
      height: spec.height
    });
  }

  private resolveObstacleY(
    type: ObstacleType,
    height: number,
    difficulty: number
  ): number {
    if (type !== "bird") {
      const groundClearance = this.config.obstacles[type].groundClearance ?? 0;
      return this.config.world.groundY - height - groundClearance;
    }

    const lowLaneY = this.config.world.groundY - height - 36;
    const midLaneY = this.config.world.groundY - height - 12;
    const highLaneY = this.config.world.groundY - height - 72;
    const laneDraw = Math.random();

    if (laneDraw < lerp(0.44, 0.3, difficulty)) {
      return lowLaneY;
    }
    if (laneDraw < 0.9) {
      return midLaneY;
    }
    return highLaneY;
  }

  private registerSpawn(type: ObstacleType): void {
    if (isCactusType(type)) {
      this.cactusStreak += 1;
      return;
    }

    this.cactusStreak = 0;
  }
}

function isCactusType(type: ObstacleType): boolean {
  return type === "lowSmall" || type === "lowLarge" || type === "high";
}
