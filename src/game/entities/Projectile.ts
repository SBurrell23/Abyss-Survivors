import { Game } from '../Game';
import { Vector2 } from '../utils';
import { SpriteFactory } from '../graphics/SpriteFactory';

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
    
    const velocity = this.velocity;
    const angle = Math.atan2(velocity.y, velocity.x);
    ctx.rotate(angle);

    const sprite = SpriteFactory.getSprite('projectile_torpedo');
    const scale = 2;
    ctx.drawImage(sprite, -sprite.width * scale / 2, -sprite.height * scale / 2, sprite.width * scale, sprite.height * scale);

    ctx.restore();
  }
}

