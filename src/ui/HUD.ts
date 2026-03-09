import { Player } from "../entities/Player";
import type { DeathCause, GameConfig, RuntimeGameState } from "../types";

export class HUD {
  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly config: GameConfig
  ) {}

  render(state: RuntimeGameState, player: Player): void {
    this.drawTopStats(state, player);

    if (state.phase === "start") {
      this.drawCenterPanel(
        "DINO FASE FANTASMA",
        [
          "Corra, pule e sobreviva ao cenário procedural.",
          "Space/↑: pular",
          "↓: abaixar",
          "Segure Z/Shift: intangibilidade",
          "Esc: pausar",
          "Pressione Space ou Enter para iniciar"
        ],
        "#1f2329"
      );
    }

    if (state.phase === "paused") {
      this.drawCenterPanel(
        "PAUSADO",
        ["Pressione Esc para continuar"],
        "#1f2329"
      );
    }

    if (state.phase === "gameover" && state.deathCause) {
      this.drawCenterPanel(
        "GAME OVER",
        [
          this.deathMessage(state.deathCause),
          `Pontuação: ${state.score}`,
          "Pressione Space ou Enter para reiniciar"
        ],
        state.deathCause === "collision" ? "#9a1f1f" : "#0f6f80"
      );
    }
  }

  private drawTopStats(state: RuntimeGameState, player: Player): void {
    this.ctx.save();
    this.ctx.fillStyle = "#121722";
    this.ctx.font = '16px "IBM Plex Mono", monospace';
    this.ctx.textBaseline = "top";
    this.ctx.fillText(`PONTOS ${state.score}`, 16, 14);
    this.ctx.fillText(`RECORDE ${state.bestScore}`, 16, 36);
    this.ctx.fillText(`VEL ${state.speed.toFixed(0)} px/s`, 16, 58);
    this.ctx.fillText(
      `POSTURA ${player.isLowering ? "ABAIXADO" : "NORMAL"}`,
      16,
      80
    );

    if (state.debug) {
      this.ctx.fillStyle = "#b85100";
      this.ctx.fillText("DEBUG HITBOX", 16, 102);
    }
    this.ctx.restore();

    this.drawIntangibilityMeter(player, state.elapsedSeconds);
  }

  private drawIntangibilityMeter(player: Player, elapsedSeconds: number): void {
    const meterWidth = 248;
    const meterHeight = 16;
    const x = this.config.canvas.width - meterWidth - 20;
    const y = 26;
    const ratio = player.intangibilityRatio;
    const warningAt = this.config.player.warningThreshold;

    this.ctx.save();
    this.ctx.fillStyle = "#273241";
    this.ctx.font = '14px "IBM Plex Mono", monospace';
    this.ctx.textAlign = "right";
    this.ctx.textBaseline = "top";
    this.ctx.fillText("INTANGIBILIDADE", x + meterWidth, y - 20);
    this.ctx.fillRect(x, y, meterWidth, meterHeight);

    const fillWidth = Math.floor(meterWidth * ratio);
    const nearLimit = ratio >= warningAt;
    const pulse = 0.6 + 0.4 * Math.sin(elapsedSeconds * this.config.visual.warningPulseHz);

    let fillColor = "#2eaf68";
    if (ratio >= 0.55) {
      fillColor = "#ce9d1f";
    }
    if (nearLimit) {
      fillColor = `rgba(205, 48, 30, ${pulse})`;
    }

    this.ctx.fillStyle = fillColor;
    this.ctx.fillRect(x, y, fillWidth, meterHeight);

    this.ctx.strokeStyle = "#161d29";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, meterWidth, meterHeight);

    this.ctx.textAlign = "left";
    this.ctx.fillStyle = player.isIntangible ? "#0f6f80" : "#3a4559";
    this.ctx.fillText(player.isIntangible ? "ATIVA" : "EM RECARGA", x, y + 22);

    if (nearLimit && player.isIntangible) {
      this.ctx.fillStyle = "#b72121";
      this.ctx.fillText("RISCO DE SOBRECARGA", x, y + 40);
    }

    this.ctx.restore();
  }

  private drawCenterPanel(title: string, lines: string[], color: string): void {
    const panelWidth = 620;
    const panelHeight = 220;
    const x = (this.config.canvas.width - panelWidth) / 2;
    const y = (this.config.canvas.height - panelHeight) / 2;

    this.ctx.save();
    this.ctx.fillStyle = "rgba(250, 252, 255, 0.9)";
    this.ctx.fillRect(x, y, panelWidth, panelHeight);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, panelWidth, panelHeight);

    this.ctx.fillStyle = color;
    this.ctx.font = '24px "IBM Plex Mono", monospace';
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "top";
    this.ctx.fillText(title, this.config.canvas.width / 2, y + 20);

    this.ctx.font = '15px "IBM Plex Mono", monospace';
    lines.forEach((line, index) => {
      this.ctx.fillText(line, this.config.canvas.width / 2, y + 66 + index * 25);
    });
    this.ctx.restore();
  }

  private deathMessage(cause: DeathCause): string {
    if (cause === "collision") {
      return "Você colidiu com um obstáculo.";
    }

    return "Sobrecarga: uso contínuo excessivo da intangibilidade.";
  }
}
