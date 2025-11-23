import { Game } from '../Game';
import { Vector2 } from '../utils';

export class Projectile {
  game: Game;
  position: Vector2;
  velocity: Vector2;
  radius: number = 4;
  damage: number = 10;
  duration: number = 2; // seconds
  active: boolean = true;

  constructor(game: Game, x: number, y: number, velocity: Vector2) {
    this.game = game;
    this.position = new Vector2(x, y);
    this.velocity = velocity;
  }

  update(dt: number) {
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    
    this.duration -= dt;
    if (this.duration <= 0) {
        this.active = false;
    }
  }

  onHit(_target: any) {
      this.active = false;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

