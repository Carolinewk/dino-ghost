import type { GameConfig, InputSnapshot, Rect } from "../types";
import { clamp } from "../utils/math";

export class Player {
  readonly x: number;
  readonly standingWidth: number;
  readonly standingHeight: number;
  readonly crouchWidth: number;
  readonly crouchHeight: number;
  private currentWidth: number;
  private currentHeight: number;
  y: number;
  velocityY = 0;
  isGrounded = true;
  isLowering = false;
  isIntangible = false;
  intangibleUsageSeconds = 0;

  constructor(private readonly config: GameConfig) {
    this.x = config.player.startX;
    this.standingWidth = config.player.width;
    this.standingHeight = config.player.height;
    this.crouchWidth = config.player.crouchWidth;
    this.crouchHeight = config.player.crouchHeight;
    this.currentWidth = this.standingWidth;
    this.currentHeight = this.standingHeight;
    this.y = config.world.groundY - this.currentHeight;
  }

  get width(): number {
    return this.currentWidth;
  }

  get height(): number {
    return this.currentHeight;
  }

  get rect(): Rect {
    return {
      x: this.x,
      y: this.y,
      width: this.currentWidth,
      height: this.currentHeight
    };
  }

  get intangibilityRatio(): number {
    return clamp(
      this.intangibleUsageSeconds / this.config.player.intangibleMaxSeconds,
      0,
      1
    );
  }

  reset(): void {
    this.currentWidth = this.standingWidth;
    this.currentHeight = this.standingHeight;
    this.y = this.config.world.groundY - this.currentHeight;
    this.velocityY = 0;
    this.isGrounded = true;
    this.isLowering = false;
    this.isIntangible = false;
    this.intangibleUsageSeconds = 0;
  }

  update(dt: number, input: InputSnapshot): boolean {
    let jumped = false;
    const lowerHeld = input.lowerHeld && this.isGrounded;

    if (input.jumpPressed && this.isGrounded && !lowerHeld) {
      this.velocityY = this.config.physics.jumpVelocity;
      this.isGrounded = false;
      jumped = true;
    }

    this.isLowering = lowerHeld;
    this.currentWidth = this.isLowering ? this.crouchWidth : this.standingWidth;
    this.currentHeight = this.isLowering ? this.crouchHeight : this.standingHeight;
    if (this.isGrounded) {
      this.y = this.config.world.groundY - this.currentHeight;
    }

    if (input.intangibleHeld) {
      this.isIntangible = true;
      this.intangibleUsageSeconds += dt;
    } else {
      this.isIntangible = false;
      this.intangibleUsageSeconds = Math.max(
        0,
        this.intangibleUsageSeconds -
          this.config.player.intangibleRecoveryPerSecond * dt
      );
    }

    this.velocityY += this.config.physics.gravity * dt;
    this.y += this.velocityY * dt;

    const groundTop = this.config.world.groundY - this.currentHeight;
    if (this.y >= groundTop) {
      this.y = groundTop;
      this.velocityY = 0;
      this.isGrounded = true;
    }

    return jumped;
  }

  hasOverheated(): boolean {
    return (
      this.isIntangible &&
      this.intangibleUsageSeconds > this.config.player.intangibleMaxSeconds
    );
  }
}
