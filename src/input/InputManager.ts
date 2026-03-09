import type { InputSnapshot } from "../types";

const JUMP_CODES = new Set<string>(["Space", "ArrowUp"]);
const INTANGIBLE_CODES = new Set<string>(["KeyZ", "ShiftLeft", "ShiftRight"]);
const LOWER_CODES = new Set<string>(["ArrowDown"]);

export class InputManager {
  private readonly heldKeys = new Set<string>();
  private pendingJump = false;
  private pendingPause = false;
  private pendingStart = false;
  private pendingRestart = false;
  private pendingDebugToggle = false;

  private readonly keyDownHandler = (event: KeyboardEvent): void => {
    this.heldKeys.add(event.code);

    if (JUMP_CODES.has(event.code) && !event.repeat) {
      this.pendingJump = true;
      this.pendingStart = true;
      this.pendingRestart = true;
    }

    if (event.code === "Enter" && !event.repeat) {
      this.pendingStart = true;
      this.pendingRestart = true;
    }

    if (event.code === "Escape" && !event.repeat) {
      this.pendingPause = true;
    }

    if (event.code === "KeyD" && !event.repeat) {
      this.pendingDebugToggle = true;
    }

    if (
      JUMP_CODES.has(event.code) ||
      LOWER_CODES.has(event.code) ||
      INTANGIBLE_CODES.has(event.code) ||
      event.code === "Enter" ||
      event.code === "Escape"
    ) {
      event.preventDefault();
    }
  };

  private readonly keyUpHandler = (event: KeyboardEvent): void => {
    this.heldKeys.delete(event.code);
  };

  constructor() {
    window.addEventListener("keydown", this.keyDownHandler);
    window.addEventListener("keyup", this.keyUpHandler);
  }

  consumeSnapshot(): InputSnapshot {
    const snapshot: InputSnapshot = {
      jumpPressed: this.pendingJump,
      lowerHeld: this.isLowerHeld(),
      intangibleHeld: this.isIntangibleHeld(),
      pausePressed: this.pendingPause,
      startPressed: this.pendingStart,
      restartPressed: this.pendingRestart,
      debugTogglePressed: this.pendingDebugToggle
    };

    this.pendingJump = false;
    this.pendingPause = false;
    this.pendingStart = false;
    this.pendingRestart = false;
    this.pendingDebugToggle = false;

    return snapshot;
  }

  destroy(): void {
    window.removeEventListener("keydown", this.keyDownHandler);
    window.removeEventListener("keyup", this.keyUpHandler);
  }

  private isIntangibleHeld(): boolean {
    for (const code of INTANGIBLE_CODES) {
      if (this.heldKeys.has(code)) {
        return true;
      }
    }

    return false;
  }

  private isLowerHeld(): boolean {
    for (const code of LOWER_CODES) {
      if (this.heldKeys.has(code)) {
        return true;
      }
    }

    return false;
  }
}
