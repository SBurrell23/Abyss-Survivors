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
    
    // Scale size based on value, max 3x
    // Base value is approx 10?
    const baseRadius = 5;
    const scale = Math.min(3, 1 + (value - 10) / 100); 
    this.radius = baseRadius * scale;
  }
  
  // Magnet effect - pulls XP orbs toward player when within range
  update(dt: number) {
      const dist = this.position.distanceTo(this.game.player.position);
      if (dist < this.game.player.magnetRadius) { // Use player's magnet radius (upgrades affect this)
          const dir = this.game.player.position.sub(this.position).normalize();
          // Make XP orb speed scale with player speed, ensuring it's always faster (1.5x player speed)
          const orbSpeed = Math.max(300, this.game.player.speed * 1.5);
          this.position.x += dir.x * orbSpeed * dt;
          this.position.y += dir.y * orbSpeed * dt;
      }
  }

  draw(ctx: CanvasRenderingContext2D) {
      const sprite = SpriteFactory.getSprite('xp_orb');
      const scale = (this.radius / 5) * 1.5; // Adjust sprite scale to match radius
      
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
