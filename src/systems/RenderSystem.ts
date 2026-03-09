import type { Obstacle } from "../entities/Obstacle";
import { Player } from "../entities/Player";
import type { DeathCause, GameConfig, ObstacleType, RuntimeGameState } from "../types";
import { easeOutQuad, hashToUnit } from "../utils/math";

interface Piece {
  x: number;
  y: number;
  width: number;
  height: number;
}

type SpritePiece = readonly [number, number, number, number];

interface BackgroundCloud {
  startX: number;
  y: number;
  scale: number;
  speedFactor: number;
}

export class RenderSystem {
  private readonly clouds: BackgroundCloud[];

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly config: GameConfig
  ) {
    this.clouds = createCloudPreset(config.canvas.width);
  }

  render(state: RuntimeGameState, player: Player, obstacles: Obstacle[]): void {
    this.ctx.clearRect(0, 0, this.config.canvas.width, this.config.canvas.height);
    this.drawBackground(state.distance);
    this.drawGround(state.distance);
    this.drawObstacles(obstacles, player.intangibilityRatio, player.isIntangible);
    this.drawPlayer(player, state.elapsedSeconds);

    if (state.debug) {
      this.drawHitboxes(player, obstacles);
    }

    if (state.phase === "gameover" && state.deathCause) {
      this.drawDeathTint(state.deathCause);
    }
  }

  private drawBackground(distance: number): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.config.canvas.height);
    gradient.addColorStop(0, "#f9fbff");
    gradient.addColorStop(1, "#edf1f8");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.config.canvas.width, this.config.canvas.height);

    this.drawClouds(distance);

    this.ctx.fillStyle = "#dbe4f2";
    this.ctx.fillRect(0, this.config.world.groundY + 2, this.config.canvas.width, 5);
  }

  private drawClouds(distance: number): void {
    const cloudSpan = this.config.canvas.width + 220;
    for (const cloud of this.clouds) {
      const travel = distance * cloud.speedFactor;
      const wrappedX =
        ((cloud.startX - travel) % cloudSpan + cloudSpan) % cloudSpan - 110;
      this.drawPixelCloud(Math.round(wrappedX), cloud.y, cloud.scale);
    }
  }

  private drawPixelCloud(x: number, y: number, scale: number): void {
    const pixel = 2 * scale;
    const blocks: readonly [number, number, number, number][] = [
      [4, 0, 10, 2],
      [2, 2, 16, 2],
      [0, 4, 22, 4],
      [2, 8, 18, 2],
      [6, 10, 11, 2]
    ];

    this.ctx.save();
    this.ctx.fillStyle = "#d0dae9";
    for (const [bx, by, bw, bh] of blocks) {
      this.ctx.fillRect(x + bx * pixel, y + by * pixel, bw * pixel, bh * pixel);
    }

    this.ctx.fillStyle = "#eef3fb";
    this.ctx.fillRect(x + 6 * pixel, y + 2 * pixel, 8 * pixel, 2 * pixel);
    this.ctx.restore();
  }

  private drawGround(distance: number): void {
    void distance;
    this.ctx.fillStyle = "#242a34";
    this.ctx.fillRect(0, this.config.world.groundY, this.config.canvas.width, 2);
  }

  private drawObstacles(
    obstacles: Obstacle[],
    intangibilityRatio: number,
    isIntangible: boolean
  ): void {
    const rampedRatio = Math.min(1, intangibilityRatio * 2.4);
    const degradationIntensity = isIntangible
      ? Math.min(1, 0.18 + easeOutQuad(rampedRatio) * 0.82)
      : 0;

    for (const obstacle of obstacles) {
      this.drawObstacle(obstacle, degradationIntensity);
    }
  }

  private drawObstacle(obstacle: Obstacle, intensity: number): void {
    if (obstacle.type === "bird") {
      this.drawBird(obstacle, intensity);
      return;
    }

    if (obstacle.type === "windmill") {
      this.drawWindmill(obstacle, intensity);
      return;
    }

    const pieces = getObstaclePieces(obstacle.type, obstacle.width, obstacle.height);
    for (let index = 0; index < pieces.length; index += 1) {
      const piece = pieces[index];
      this.drawDegradedRect(
        obstacle.id * 196613 + index * 7867,
        obstacle.x + piece.x,
        obstacle.y + piece.y,
        piece.width,
        piece.height,
        intensity
      );
    }
  }

  private drawBird(obstacle: Obstacle, intensity: number): void {
    const x = Math.round(obstacle.x);
    const y = Math.round(obstacle.y + 1);
    const flap = Math.sin(
      obstacle.ageSeconds * this.config.visual.birdWingFlapHz + obstacle.id * 0.57
    );
    const wingFrame = flap > 0 ? BIRD_WING_UP : BIRD_WING_DOWN;
    const spriteWidth = 46;

    for (let index = 0; index < BIRD_BODY.length; index += 1) {
      const [bx, by, bw, bh] = BIRD_BODY[index];
      this.drawDegradedRect(
        obstacle.id * 113 + index * 17,
        x + (spriteWidth - bx - bw),
        y + by,
        bw,
        bh,
        intensity
      );
    }

    for (let index = 0; index < wingFrame.length; index += 1) {
      const [bx, by, bw, bh] = wingFrame[index];
      this.drawDegradedRect(
        obstacle.id * 181 + index * 23,
        x + (spriteWidth - bx - bw),
        y + by,
        bw,
        bh,
        intensity
      );
    }

    this.ctx.save();
    this.ctx.fillStyle = "#edf2fb";
    this.ctx.fillRect(x + 13, y + 14, 2, 2);
    this.ctx.restore();
  }

  private drawWindmill(obstacle: Obstacle, intensity: number): void {
    const centerX = obstacle.x + obstacle.width * 0.5;
    const centerY = obstacle.y + obstacle.height * 0.47;
    const bladeRootLength = obstacle.width * 0.38;
    const bladeTipLength = obstacle.width * 0.2;
    const bladeRootThickness = 10;
    const bladeTipThickness = 6;
    const bladeRootDistance = bladeRootLength * 0.5 + 6;
    const bladeTipDistance = bladeRootLength + bladeTipLength * 0.5 + 6;

    this.drawWindmillBase(centerX, centerY);

    for (let index = 0; index < 4; index += 1) {
      const angle = obstacle.rotationRadians + (Math.PI / 2) * index;
      const rootCenterX = centerX + Math.cos(angle) * bladeRootDistance;
      const rootCenterY = centerY + Math.sin(angle) * bladeRootDistance;
      const tipCenterX = centerX + Math.cos(angle) * bladeTipDistance;
      const tipCenterY = centerY + Math.sin(angle) * bladeTipDistance;

      this.drawDegradedRotatedRect(
        obstacle.id * 239 + index * 37,
        rootCenterX,
        rootCenterY,
        bladeRootLength,
        bladeRootThickness,
        angle,
        intensity
      );

      this.drawDegradedRotatedRect(
        obstacle.id * 271 + index * 53,
        tipCenterX,
        tipCenterY,
        bladeTipLength,
        bladeTipThickness,
        angle,
        intensity
      );
    }

    this.drawDegradedRect(
      obstacle.id * 313,
      centerX - 9,
      centerY - 9,
      18,
      18,
      intensity
    );
    this.drawDegradedRect(
      obstacle.id * 337,
      centerX - 4,
      centerY - 4,
      8,
      8,
      intensity
    );
  }

  private drawWindmillBase(centerX: number, centerY: number): void {
    const groundY = this.config.world.groundY;
    const mastTop = centerY + 8;
    const mastWidth = 10;
    const mastHeight = Math.max(0, groundY - mastTop);

    this.ctx.save();
    this.ctx.fillStyle = "#2a303a";
    this.ctx.fillRect(Math.round(centerX - mastWidth / 2), mastTop, mastWidth, mastHeight);

    this.ctx.fillStyle = "#353d49";
    this.ctx.fillRect(Math.round(centerX - 18), groundY - 16, 5, 12);
    this.ctx.fillRect(Math.round(centerX + 13), groundY - 16, 5, 12);
    this.ctx.fillRect(Math.round(centerX - 20), groundY - 6, 40, 3);

    this.ctx.fillStyle = "#3d4654";
    this.ctx.fillRect(Math.round(centerX - 7), Math.round(centerY + 4), 14, 10);
    this.ctx.fillRect(Math.round(centerX - 24), groundY + 1, 48, 4);
    this.ctx.restore();
  }

  private drawDegradedRect(
    seedBase: number,
    x: number,
    y: number,
    width: number,
    height: number,
    intensity: number
  ): void {
    const clampedIntensity = Math.max(0, Math.min(1, intensity));
    if (clampedIntensity <= 0.03) {
      this.ctx.fillStyle = "#1f2329";
      this.ctx.fillRect(x, y, width, height);
      return;
    }

    const cell = 4;
    const dropout = clampedIntensity * this.config.visual.degradationMaxDropout;
    const alpha = 1 - clampedIntensity * this.config.visual.degradationOpacityLoss;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = "#1f2329";

    for (let cy = 0; cy < height; cy += cell) {
      for (let cx = 0; cx < width; cx += cell) {
        const h = hashToUnit(seedBase + cx * 131 + cy * 197);
        if (h < dropout) {
          continue;
        }

        const drawWidth = Math.min(cell, width - cx);
        const drawHeight = Math.min(cell, height - cy);
        this.ctx.fillRect(x + cx, y + cy, drawWidth, drawHeight);
      }
    }

    this.ctx.restore();
  }

  private drawDegradedRotatedRect(
    seedBase: number,
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    angle: number,
    intensity: number
  ): void {
    const clampedIntensity = Math.max(0, Math.min(1, intensity));
    const cell = 4;

    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate(angle);

    if (clampedIntensity <= 0.03) {
      this.ctx.fillStyle = "#1f2329";
      this.ctx.fillRect(-width / 2, -height / 2, width, height);
      this.ctx.restore();
      return;
    }

    const dropout = clampedIntensity * this.config.visual.degradationMaxDropout;
    const alpha = 1 - clampedIntensity * this.config.visual.degradationOpacityLoss;

    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = "#1f2329";

    for (let y = -height / 2; y < height / 2; y += cell) {
      for (let x = -width / 2; x < width / 2; x += cell) {
        const h = hashToUnit(seedBase + Math.floor((x + 500) * 31 + y * 47));
        if (h < dropout) {
          continue;
        }

        const drawWidth = Math.min(cell, width / 2 - x);
        const drawHeight = Math.min(cell, height / 2 - y);
        this.ctx.fillRect(x, y, drawWidth, drawHeight);
      }
    }

    this.ctx.restore();
  }

  private drawPlayer(player: Player, elapsedSeconds: number): void {
    const x = player.x;
    const y = player.y;
    const runningFrame = Math.floor(elapsedSeconds * 12) % 2;
    const airborne = !player.isGrounded;

    if (player.isIntangible) {
      this.ctx.save();
      this.ctx.globalAlpha = 0.22;
      this.ctx.fillStyle = "#2c9aa7";
      this.drawDinoShape(x - 8, y + 1, runningFrame, airborne, player.isLowering);
      this.ctx.fillRect(x - 14, y + 18, 8, 8);
      this.ctx.restore();
    }

    this.ctx.save();
    this.ctx.fillStyle = player.isIntangible ? "#147d8a" : "#1f2329";
    this.drawDinoShape(x, y, runningFrame, airborne, player.isLowering);

    if (player.isIntangible) {
      this.ctx.strokeStyle = "#56d1de";
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x - 1, y - 1, player.width + 2, player.height + 2);
    }

    this.ctx.restore();
  }

  private drawDinoShape(
    x: number,
    y: number,
    runningFrame: number,
    airborne: boolean,
    lowering: boolean
  ): void {
    if (lowering && !airborne) {
      this.drawDinoLowerShape(x, y, runningFrame);
      return;
    }

    this.drawDinoStandingShape(x, y, runningFrame, airborne);
  }

  private drawDinoStandingShape(
    x: number,
    y: number,
    runningFrame: number,
    airborne: boolean
  ): void {
    this.ctx.fillRect(x + 8, y + 18, 24, 19);
    this.ctx.fillRect(x + 24, y + 3, 16, 15);
    this.ctx.fillRect(x + 3, y + 24, 8, 8);

    if (airborne) {
      this.ctx.fillRect(x + 12, y + 37, 7, 13);
      this.ctx.fillRect(x + 24, y + 37, 7, 13);
      return;
    }

    if (runningFrame === 0) {
      this.ctx.fillRect(x + 11, y + 37, 7, 13);
      this.ctx.fillRect(x + 24, y + 37, 7, 10);
    } else {
      this.ctx.fillRect(x + 11, y + 37, 7, 10);
      this.ctx.fillRect(x + 24, y + 37, 7, 13);
    }
  }

  private drawDinoLowerShape(x: number, y: number, runningFrame: number): void {
    this.ctx.fillRect(x + 4, y + 10, 36, 14);
    this.ctx.fillRect(x + 35, y + 2, 16, 10);
    this.ctx.fillRect(x + 52, y + 8, 6, 7);
    this.ctx.fillRect(x + 0, y + 15, 6, 7);

    if (runningFrame === 0) {
      this.ctx.fillRect(x + 14, y + 24, 10, 6);
      this.ctx.fillRect(x + 30, y + 24, 10, 5);
    } else {
      this.ctx.fillRect(x + 14, y + 24, 10, 5);
      this.ctx.fillRect(x + 30, y + 24, 10, 6);
    }
  }

  private drawHitboxes(player: Player, obstacles: Obstacle[]): void {
    this.ctx.save();
    this.ctx.strokeStyle = "#c45500";
    this.ctx.lineWidth = 1.5;
    this.ctx.setLineDash([5, 4]);
    this.ctx.strokeRect(player.x, player.y, player.width, player.height);

    this.ctx.strokeStyle = "#0f7a5a";
    for (const obstacle of obstacles) {
      this.ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    }
    this.ctx.restore();
  }

  private drawDeathTint(cause: DeathCause): void {
    this.ctx.save();
    this.ctx.fillStyle =
      cause === "collision" ? "rgba(187, 20, 20, 0.18)" : "rgba(20, 133, 163, 0.2)";
    this.ctx.fillRect(0, 0, this.config.canvas.width, this.config.canvas.height);
    this.ctx.restore();
  }
}

const BIRD_BODY: readonly SpritePiece[] = [
  [11, 15, 17, 7],
  [26, 12, 8, 6],
  [34, 14, 6, 2],
  [8, 16, 4, 4],
  [17, 21, 9, 3],
  [20, 24, 2, 5],
  [25, 24, 2, 5]
];

const BIRD_WING_UP: readonly SpritePiece[] = [
  [5, 7, 14, 3],
  [2, 5, 8, 3],
  [16, 18, 11, 3]
];

const BIRD_WING_DOWN: readonly SpritePiece[] = [
  [10, 12, 10, 3],
  [18, 19, 13, 4],
  [24, 23, 10, 3]
];

function createCloudPreset(canvasWidth: number): BackgroundCloud[] {
  const baseClouds: readonly BackgroundCloud[] = [
    { startX: 90, y: 52, scale: 1, speedFactor: 0.12 },
    { startX: 280, y: 92, scale: 1, speedFactor: 0.16 },
    { startX: 470, y: 64, scale: 1.2, speedFactor: 0.1 },
    { startX: 690, y: 116, scale: 1, speedFactor: 0.14 },
    { startX: 890, y: 76, scale: 1, speedFactor: 0.18 }
  ];

  const repeated: BackgroundCloud[] = [];
  for (const cloud of baseClouds) {
    repeated.push(cloud);
    repeated.push({
      ...cloud,
      startX: cloud.startX + canvasWidth + 220
    });
  }

  return repeated;
}

function getObstaclePieces(type: ObstacleType, width: number, height: number): Piece[] {
  switch (type) {
    case "lowSmall":
      return [
        {
          x: Math.round(width * 0.28),
          y: 0,
          width: Math.round(width * 0.44),
          height
        },
        {
          x: 0,
          y: Math.round(height * 0.46),
          width: Math.round(width * 0.33),
          height: Math.round(height * 0.18)
        },
        {
          x: Math.round(width * 0.62),
          y: Math.round(height * 0.3),
          width: Math.round(width * 0.3),
          height: Math.round(height * 0.15)
        }
      ];
    case "lowLarge":
      return [
        {
          x: Math.round(width * 0.18),
          y: Math.round(height * 0.16),
          width: Math.round(width * 0.3),
          height: Math.round(height * 0.84)
        },
        {
          x: Math.round(width * 0.5),
          y: 0,
          width: Math.round(width * 0.3),
          height
        },
        {
          x: Math.round(width * 0.72),
          y: Math.round(height * 0.42),
          width: Math.round(width * 0.22),
          height: Math.round(height * 0.22)
        }
      ];
    case "high":
      return [
        {
          x: Math.round(width * 0.24),
          y: 0,
          width: Math.round(width * 0.52),
          height
        },
        {
          x: 0,
          y: Math.round(height * 0.7),
          width: Math.round(width * 0.26),
          height: Math.round(height * 0.16)
        },
        {
          x: Math.round(width * 0.72),
          y: Math.round(height * 0.58),
          width: Math.round(width * 0.28),
          height: Math.round(height * 0.2)
        }
      ];
    default:
      return [];
  }
}
