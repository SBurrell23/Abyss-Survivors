import { Game } from '../Game';
import { Vector2 } from '../utils';

export class XPOrb {
  game: Game;
  position: Vector2;
  value: number = 10;
  radius: number = 5;
  active: boolean = true;

  constructor(game: Game, x: number, y: number, value: number) {
    this.game = game;
    this.position = new Vector2(x, y);
    this.value = value;
  }
  
  // Might add magnet effect update here
  update(dt: number) {
      const dist = this.position.distanceTo(this.game.player.position);
      if (dist < 100) { // Magnet range
          const dir = this.game.player.position.sub(this.position).normalize();
          this.position.x += dir.x * 300 * dt;
          this.position.y += dir.y * 300 * dt;
      }
  }

  draw(ctx: CanvasRenderingContext2D) {
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
  }
}

