import { GAME_CONFIG } from "../config/gameConfig";
import { Obstacle } from "../entities/Obstacle";
import { Player } from "../entities/Player";
import { InputManager } from "../input/InputManager";
import { CollisionSystem } from "../systems/CollisionSystem";
import { RenderSystem } from "../systems/RenderSystem";
import { SpawnSystem } from "../systems/SpawnSystem";
import type { DeathCause, GameConfig, InputSnapshot, RuntimeGameState } from "../types";
import { clamp } from "../utils/math";
import { HUD } from "../ui/HUD";
import {
  createInitialGameState,
  loadBestScore,
  resetRunMetrics,
  saveBestScore
} from "./GameState";

export class Game {
  private readonly config: GameConfig;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly input: InputManager;
  private readonly player: Player;
  private readonly obstacles: Obstacle[] = [];
  private readonly spawnSystem: SpawnSystem;
  private readonly collisionSystem: CollisionSystem;
  private readonly renderSystem: RenderSystem;
  private readonly hud: HUD;
  private readonly state: RuntimeGameState;

  private rafId = 0;
  private lastTimestamp = 0;
  private accumulatorSeconds = 0;
  private readonly fixedStepSeconds = 1 / 120;
  private readonly maxSubstepsPerFrame = 8;
  private jumpBufferSeconds = 0;
  private readonly jumpBufferDurationSeconds = 0.12;

  constructor(private readonly canvas: HTMLCanvasElement, config: GameConfig = GAME_CONFIG) {
    this.config = config;
    this.canvas.width = config.canvas.width;
    this.canvas.height = config.canvas.height;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("CanvasRenderingContext2D não disponível.");
    }
    this.ctx = ctx;

    const bestScore = loadBestScore();
    this.state = createInitialGameState(bestScore);

    this.input = new InputManager();
    this.player = new Player(config);
    this.spawnSystem = new SpawnSystem(config);
    this.collisionSystem = new CollisionSystem(config.collision.padding);
    this.renderSystem = new RenderSystem(ctx, config);
    this.hud = new HUD(ctx, config);
  }

  start(): void {
    this.rafId = window.requestAnimationFrame(this.loop);
  }

  destroy(): void {
    window.cancelAnimationFrame(this.rafId);
    this.input.destroy();
  }

  private readonly loop = (timestamp: number): void => {
    if (this.lastTimestamp === 0) {
      this.lastTimestamp = timestamp;
    }

    const frameSeconds = Math.max(0, (timestamp - this.lastTimestamp) / 1000);
    this.lastTimestamp = timestamp;
    this.accumulatorSeconds += Math.min(frameSeconds, 0.12);

    const input = this.input.consumeSnapshot();
    this.handleGlobalInput(input);

    if (this.state.phase === "running") {
      if (input.jumpPressed) {
        this.jumpBufferSeconds = this.jumpBufferDurationSeconds;
      }

      let substeps = 0;
      while (
        this.accumulatorSeconds >= this.fixedStepSeconds &&
        substeps < this.maxSubstepsPerFrame
      ) {
        const stepInput: InputSnapshot = {
          ...input,
          jumpPressed: this.jumpBufferSeconds > 0
        };

        const jumped = this.updateRunning(this.fixedStepSeconds, stepInput);
        if (jumped) {
          this.jumpBufferSeconds = 0;
        } else if (this.jumpBufferSeconds > 0) {
          this.jumpBufferSeconds = Math.max(
            0,
            this.jumpBufferSeconds - this.fixedStepSeconds
          );
        }

        this.accumulatorSeconds -= this.fixedStepSeconds;
        substeps += 1;

        if (this.state.phase !== "running") {
          this.accumulatorSeconds = 0;
          break;
        }
      }

      if (substeps >= this.maxSubstepsPerFrame) {
        this.accumulatorSeconds = Math.min(
          this.accumulatorSeconds,
          this.fixedStepSeconds
        );
      }
    } else {
      this.accumulatorSeconds = 0;
      this.jumpBufferSeconds = 0;
    }

    this.renderSystem.render(this.state, this.player, this.obstacles);
    this.hud.render(this.state, this.player);

    this.rafId = window.requestAnimationFrame(this.loop);
  };

  private handleGlobalInput(input: InputSnapshot): void {
    if (input.debugTogglePressed) {
      this.state.debug = !this.state.debug;
    }

    if (input.pausePressed) {
      if (this.state.phase === "running") {
        this.state.phase = "paused";
      } else if (this.state.phase === "paused") {
        this.state.phase = "running";
      }
    }

    if (this.state.phase === "start" && input.startPressed) {
      this.startRun();
      return;
    }

    if (this.state.phase === "gameover" && input.restartPressed) {
      this.startRun();
    }
  }

  private updateRunning(dt: number, input: InputSnapshot): boolean {
    this.state.elapsedSeconds += dt;
    this.state.speed = Math.min(
      this.config.runner.maxSpeed,
      this.config.runner.initialSpeed +
        this.config.runner.acceleration * this.state.elapsedSeconds
    );

    const jumped = this.player.update(dt, input);
    if (this.player.hasOverheated()) {
      this.triggerGameOver("overheat");
      return jumped;
    }

    this.spawnSystem.update(
      dt,
      this.state.elapsedSeconds,
      this.state.speed,
      this.obstacles
    );

    for (const obstacle of this.obstacles) {
      obstacle.update(dt, this.state.speed, this.config.visual);
    }

    for (let index = this.obstacles.length - 1; index >= 0; index -= 1) {
      if (this.obstacles[index].isOffscreen()) {
        this.obstacles.splice(index, 1);
      }
    }

    if (this.collisionSystem.hasCollision(this.player, this.obstacles)) {
      this.triggerGameOver("collision");
      return jumped;
    }

    this.state.distance += this.state.speed * dt;
    const score = Math.floor(this.state.distance * this.config.runner.scorePerPixel);
    this.state.score = Math.max(0, score);

    if (this.state.score > this.state.bestScore) {
      this.state.bestScore = this.state.score;
      saveBestScore(this.state.bestScore);
    }

    return jumped;
  }

  private startRun(): void {
    this.obstacles.length = 0;
    this.player.reset();
    this.spawnSystem.reset();
    resetRunMetrics(this.state);
    this.state.speed = this.config.runner.initialSpeed;
    this.jumpBufferSeconds = 0;
    this.state.phase = "running";
  }

  private triggerGameOver(cause: DeathCause): void {
    this.state.phase = "gameover";
    this.state.deathCause = cause;
    this.player.isIntangible = false;
    this.player.intangibleUsageSeconds = clamp(
      this.player.intangibleUsageSeconds,
      0,
      this.config.player.intangibleMaxSeconds
    );
  }
}
