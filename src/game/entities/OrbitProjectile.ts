import { Game } from '../Game';
import { Vector2 } from '../utils';
import { Projectile } from './Projectile';
import { SpriteFactory } from '../graphics/SpriteFactory';

export class OrbitProjectile extends Projectile {
  angle: number = 0;
  orbitRadius: number = 60;
  orbitSpeed: number = 4.5; // 50% faster (was 3)
  
  isRecovering: boolean = false;
  recoveryTime: number = 2.0;
  currentRecovery: number = 0;
  
  // New: Damage tick timer
  tickInterval: number = 0.2; // Damage every 0.2s
  tickTimers: Map<string, number> = new Map(); // Map enemy ID to cooldown

  constructor(game: Game, angleOffset: number) {
    super(game, 0, 0, new Vector2(0,0));
    this.angle = angleOffset;
    this.radius = 8;
    this.damage = 4; // Buff damage
    this.duration = Infinity;
  }

  update(dt: number) {
    // Cooldown for tick timers
    for (const [id, timer] of this.tickTimers) {
        if (timer > 0) {
            this.tickTimers.set(id, timer - dt);
        } else {
            this.tickTimers.delete(id);
        }
    }

    this.angle += this.orbitSpeed * dt;
    const playerPos = this.game.player.position;
    
    this.position.x = playerPos.x + Math.cos(this.angle) * this.orbitRadius;
    this.position.y = playerPos.y + Math.sin(this.angle) * this.orbitRadius;
  }

  // We don't use onHit for recovery anymore, just ticks
  onHit(_target: any) {
     // If target has a unique ID (we need to add one to Enemy), check timer
     // For now, let's just assume target is passed
     // We need to modify Game to pass target, or Enemy to have ID.
     // Actually Game.ts handles the collision loop.
     // We can just return true/false if damage should be applied?
     // But onHit is void.
     
     // Let's just ignore the old logic.
     // The Game loop calls takeDamage directly.
     // We need to change Game loop to check 'canHit(target)' first.
  }
  
  canHit(target: any): boolean {
      // We need a unique ID for the target to track it
      // Let's hack it by attaching a temporary ID if missing or using object ref
      if (!target._id) target._id = Math.random().toString(36).substr(2, 9);
      
      if (!this.tickTimers.has(target._id)) {
          this.tickTimers.set(target._id, this.tickInterval);
          return true;
      }
      return false;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.isRecovering) return; // Invisible while recovering

    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    
    // Check if currently hitting something (for visual feedback)
    // (Mines are circular, no rotation needed)
    let isHitting = false;
    for(const t of this.tickTimers.values()) {
        if (t > this.tickInterval - 0.1) {
            isHitting = true;
            break;
        }
    }

    // Use sea mine sprite for circling mines
    const sprite = SpriteFactory.getSprite('sea_mine');
    const scale = 1.5; // Half the previous size
    
    // Add glow effect when hitting
    if (isHitting) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#808080'; // Gray glow when hitting
    }
    
    ctx.drawImage(sprite, -sprite.width * scale / 2, -sprite.height * scale / 2, sprite.width * scale, sprite.height * scale);

    ctx.restore();
  }
}

