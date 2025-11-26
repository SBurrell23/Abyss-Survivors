import { Game } from '../Game';
import { Vector2 } from '../utils';
import { SpriteFactory } from '../graphics/SpriteFactory';

export class HealthPack {
  game: Game;
  position: Vector2;
  radius: number = 10;
  active: boolean = true;
  healAmount: number = 15;
  hasPlayedSound: boolean = false;
  bobOffset: number = 0;
  pulseTimer: number = 0;

  constructor(game: Game, x: number, y: number) {
    this.game = game;
    this.position = new Vector2(x, y);
    this.bobOffset = Math.random() * Math.PI * 2; // Random starting phase for bobbing
  }
  
  update(dt: number) {
    if (!this.active) return;
    
    this.pulseTimer += dt * 3; // Pulse animation
    
    // Check collision with player
    const dist = this.position.distanceTo(this.game.player.position);
    if (dist < this.radius + this.game.player.radius) {
      // Heal player
      const oldHp = this.game.player.hp;
      this.game.player.hp = Math.min(this.game.player.maxHp, this.game.player.hp + this.healAmount);
      const healed = this.game.player.hp - oldHp;
      
      if (healed > 0) {
        // Play sound immediately (non-blocking) and deactivate
        if (!this.hasPlayedSound) {
          this.hasPlayedSound = true;
          this.game.soundManager.playMedkitPickup();
        }
        this.active = false;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.active) return;
    
    // Bobbing animation
    const bobAmount = Math.sin(this.pulseTimer + this.bobOffset) * 3;
    
    // Pulse glow effect
    const pulseAlpha = 0.3 + Math.sin(this.pulseTimer * 2) * 0.2;
    
    ctx.save();
    ctx.translate(this.position.x, this.position.y + bobAmount);
    
    // Draw glow/pulse effect (less bright red)
    ctx.globalAlpha = pulseAlpha;
    ctx.fillStyle = '#cc0000'; // Less bright red
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw medkit sprite with white cross overlay
    ctx.globalAlpha = 1.0;
    const sprite = SpriteFactory.getSprite('medkit');
    if (sprite) {
      const scale = 2.0; // Bigger size
      ctx.drawImage(sprite, 
        -sprite.width * scale / 2, 
        -sprite.height * scale / 2, 
        sprite.width * scale, 
        sprite.height * scale
      );
      
      // Draw white cross overlay
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-sprite.width * scale * 0.25, -sprite.height * scale * 0.12, sprite.width * scale * 0.5, sprite.height * scale * 0.24);
      ctx.fillRect(-sprite.width * scale * 0.12, -sprite.height * scale * 0.25, sprite.width * scale * 0.24, sprite.height * scale * 0.5);
    } else {
      // Fallback: draw a simple red cross if sprite doesn't exist
      ctx.fillStyle = '#cc0000'; // Less bright red
      ctx.fillRect(-8, -3, 16, 6); // Horizontal bar
      ctx.fillRect(-3, -8, 6, 16); // Vertical bar
      
      // White cross
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-6, -2, 12, 4);
      ctx.fillRect(-2, -6, 4, 12);
    }
    
    ctx.restore();
  }
}

