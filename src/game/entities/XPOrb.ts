import { Game } from '../Game';
import { Vector2 } from '../utils';
import { SpriteFactory } from '../graphics/SpriteFactory';

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
      const sprite = SpriteFactory.getSprite('xp_orb');
      const scale = 1.5;
      
      // Simple bobbing animation
      const offset = Math.sin(Date.now() / 200) * 2;
      
      ctx.drawImage(sprite, 
          this.position.x - sprite.width * scale / 2, 
          this.position.y - sprite.height * scale / 2 + offset, 
          sprite.width * scale, 
          sprite.height * scale
      );
  }
}
