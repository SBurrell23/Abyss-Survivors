import { Game } from '../Game';
import { Vector2 } from '../utils';
import { SpriteFactory } from '../graphics/SpriteFactory';

export class XPOrb {
  game: Game;
  position: Vector2;
  value: number = 10;
  radius: number = 5;
  active: boolean = true;
  pulsePhase: number = 0; // Random phase offset for independent pulsing

  constructor(game: Game, x: number, y: number, value: number) {
    this.game = game;
    this.position = new Vector2(x, y);
    this.value = value;
    
    // Scale size based on value, max 3x
    // Base value is approx 10?
    const baseRadius = 5;
    const scale = Math.min(3, 1 + (value - 10) / 100); 
    this.radius = baseRadius * scale;
    
    // Random phase offset so each orb pulses independently
    this.pulsePhase = Math.random() * Math.PI * 2; // 0 to 2π
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
      
      // Pulse effect for shine/glow (0 to 1) - each orb pulses independently
      const pulseTime = Date.now() / 700 + this.pulsePhase; // Moderate pulse speed with phase offset
      const pulse = (Math.sin(pulseTime) + 1) / 2; // 0 to 1
      
      // Draw glow/shine effect behind the orb - subtle
      ctx.save();
      const glowRadius = this.radius * (1.6 + pulse * 0.4); // Pulse between 1.6x and 2x radius
      const glowAlpha = 0.3 + pulse * 0.25; // Pulse alpha between 0.3 and 0.55
      
      // Create gradient for glow
      const gradient = ctx.createRadialGradient(
          this.position.x, 
          this.position.y + offset, 
          0,
          this.position.x, 
          this.position.y + offset, 
          glowRadius
      );
      
      // Pulse colors: green to yellow-red - subtle shift
      const r = Math.floor(76 + pulse * 120); // 76 to 196 (more red)
      const g = Math.floor(175 + pulse * 60); // 175 to 235 (yellow)
      const b = Math.floor(80 - pulse * 40); // 80 to 40 (less blue, more yellow-red)
      
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${glowAlpha})`);
      gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${glowAlpha * 0.5})`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y + offset, glowRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      
      // Draw the sprite
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      
      ctx.drawImage(sprite, 
          this.position.x - sprite.width * scale / 2, 
          this.position.y - sprite.height * scale / 2 + offset, 
          sprite.width * scale, 
          sprite.height * scale
      );
      
      // Add subtle circular color overlay for shine - use circle instead of rect
      ctx.globalCompositeOperation = 'screen';
      const overlayAlpha = 0.15 + pulse * 0.2; // Subtle overlay (0.15 to 0.35)
      ctx.fillStyle = `rgba(255, 200, 50, ${overlayAlpha})`; // Yellow-red shine
      ctx.beginPath();
      ctx.arc(
          this.position.x, 
          this.position.y + offset, 
          this.radius * 1.2, // Slightly larger than orb
          0, 
          Math.PI * 2
      );
      ctx.fill();
      
      ctx.restore();
  }
}
