import { Player } from "../entities/Player";
import type { Obstacle } from "../entities/Obstacle";
import type { Rect } from "../types";
import { intersectsRect } from "../utils/math";

export class CollisionSystem {
  constructor(private readonly padding: number) {}

  hasCollision(player: Player, obstacles: Obstacle[]): boolean {
    if (player.isIntangible) {
      return false;
    }

    const playerRect = shrinkRect(player.rect, this.padding);
    for (const obstacle of obstacles) {
      if (obstacle.type === "windmill") {
        const bladeSweepZone = {
          x: obstacle.x + obstacle.width * 0.06,
          y: obstacle.y + obstacle.height * 0.02,
          width: obstacle.width * 0.88,
          height: obstacle.height * 0.9
        };

        if (intersectsRect(playerRect, bladeSweepZone)) {
          return !(player.isLowering && player.isGrounded);
        }
        continue;
      }

      if (intersectsRect(playerRect, obstacle.rect)) {
        return true;
      }
    }

    return false;
  }
}

function shrinkRect(rect: Rect, padding: number): Rect {
  return {
    x: rect.x + padding,
    y: rect.y + padding,
    width: Math.max(1, rect.width - padding * 2),
    height: Math.max(1, rect.height - padding * 2)
  };
}
