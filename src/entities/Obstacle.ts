import type { GameConfig, ObstacleState, ObstacleType, Rect } from "../types";

interface ObstacleInit {
  id: number;
  type: ObstacleType;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class Obstacle implements ObstacleState {
  readonly id: number;
  readonly type: ObstacleType;
  x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  ageSeconds = 0;
  rotationRadians = Math.random() * Math.PI * 2;

  constructor(init: ObstacleInit) {
    this.id = init.id;
    this.type = init.type;
    this.x = init.x;
    this.y = init.y;
    this.width = init.width;
    this.height = init.height;
  }

  get rect(): Rect {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  update(dt: number, speed: number, visualConfig: GameConfig["visual"]): void {
    this.x -= speed * dt;
    this.ageSeconds += dt;

    if (this.type === "windmill") {
      this.rotationRadians += visualConfig.windmillSpinRadPerSecond * dt;
    }
  }

  isOffscreen(): boolean {
    return this.x + this.width < 0;
  }
}
