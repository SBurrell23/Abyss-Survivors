import { Game } from '../Game';
import { Vector2 } from '../utils';
import { SpriteFactory } from '../graphics/SpriteFactory';
import { Enemy } from './Enemy';

export class Projectile {
  game: Game;
  position: Vector2;
  velocity: Vector2;
  radius: number = 4;
  damage: number = 10;
  duration: number = 2; // seconds
  active: boolean = true;
  
  // New properties
  pierce: number = 0;
  explosionRadius: number = 0;
  isHoming: boolean = false;
  isCritical: boolean = false;
  
  // Newest properties
  isHelix: boolean = false;
  isGiant: boolean = false;
  knockbackForce: number = 0;
  freezeDuration: number = 0;
  scatterOnHit: boolean = false;
  
  timeAlive: number = 0;
  initialVelocity: Vector2; // For helix reference

  constructor(game: Game, x: number, y: number, velocity: Vector2) {
    this.game = game;
    this.position = new Vector2(x, y);
    this.velocity = velocity;
    this.initialVelocity = new Vector2(velocity.x, velocity.y);
  }

  update(dt: number) {
    this.timeAlive += dt;
      
    // Homing Logic (Overrides Helix if active?) 
    // Let's say Homing takes precedence, or Helix only works if NOT homing?
    // Helix modifies position relative to a straight line.
    if (this.isHoming) {
        let nearest = null;
        let minDst = 300; // Homing range
        
        for (const enemy of this.game.enemies) {
            const dst = this.position.distanceTo(enemy.position);
            if (dst < minDst) {
                minDst = dst;
                nearest = enemy;
            }
        }
        
        if (nearest) {
            const targetDir = nearest.position.sub(this.position).normalize();
            // Lerp velocity towards target
            const turnSpeed = 5 * dt; // Adjust turn speed
            const currentDir = this.velocity.normalize();
            const newDir = new Vector2(
                currentDir.x + (targetDir.x - currentDir.x) * turnSpeed,
                currentDir.y + (targetDir.y - currentDir.y) * turnSpeed
            ).normalize();
            
            // Preserve speed
            const speed = this.velocity.length();
            this.velocity = newDir.scale(speed);
            this.initialVelocity = this.velocity; // Update reference for Helix
        }
    }

    if (this.isHelix) {
        // Add sine wave motion perpendicular to velocity
        // We need to base it on timeAlive
        const waveFreq = 10;
        const waveAmp = 200; // Amplitude scaling
        
        // We need the perpendicular vector to the INITIAL velocity direction to stay consistent
        // Otherwise if we turn (homing), the wave turns too.
        
        const velocityDir = this.velocity.normalize();
        const perp = new Vector2(-velocityDir.y, velocityDir.x);
        
        // The visual position oscillates around the "true" trajectory
        // But we are modifying position directly.
        // P_t = P_0 + V*t + perp * sin(t)
        // Since we update incrementally:
        // dP = V*dt + d(perp*sin)/dt * dt
        // d(sin(wt))/dt = w*cos(wt)
        
        const oscVelocity = waveFreq * waveAmp * Math.cos(this.timeAlive * waveFreq);
        
        this.position.x += this.velocity.x * dt + perp.x * oscVelocity * dt;
        this.position.y += this.velocity.y * dt + perp.y * oscVelocity * dt;
        
    } else {
        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;
    }
    
    this.duration -= dt;
    if (this.duration <= 0) {
        this.active = false;
        // Scatter on death? maybe only on hit.
    }
  }

  onHit(target: any) {
      const enemy = target as Enemy;
      
      // Apply Knockback
      if (this.knockbackForce > 0 && enemy.applyKnockback) {
          const pushDir = this.velocity.normalize();
          enemy.applyKnockback(pushDir.scale(this.knockbackForce));
      }
      
      // Apply Freeze
      if (this.freezeDuration > 0 && enemy.freeze) {
          enemy.freeze(this.freezeDuration);
      }
  
      // AoE Damage
      if (this.explosionRadius > 0) {
          this.game.createExplosion(this.position, this.explosionRadius, this.damage);
      }
      
      // Scatter
      if (this.scatterOnHit) {
          this.scatter();
          this.scatterOnHit = false; // Don't scatter recursively infinite? 
          // Or just make sure scattered projectiles don't have scatterOnHit = true.
      }
      
      // Pierce Logic
      if (this.pierce > 0) {
          this.pierce--;
          if (!this.hitList) this.hitList = [];
          this.hitList.push(target);
      } else {
          this.active = false;
      }
  }
  
  scatter() {
      for (let i = 0; i < 3; i++) {
          const angle = (Math.PI / 6) * (i - 1); // -30, 0, 30 degrees relative
          const speed = this.velocity.length() * 0.8;
          
          const currentAngle = Math.atan2(this.velocity.y, this.velocity.x);
          const newAngle = currentAngle + angle + (Math.random() - 0.5) * 0.5; // Some random
          
          const vel = new Vector2(Math.cos(newAngle) * speed, Math.sin(newAngle) * speed);
          
          const p = new Projectile(this.game, this.position.x, this.position.y, vel);
          p.damage = this.damage * 0.5;
          p.duration = 1.0;
          p.radius = this.radius * 0.6;
          // Don't inherit scatter to prevent infinite loop
          p.scatterOnHit = false; 
          // Inherit others?
          p.knockbackForce = this.knockbackForce * 0.5;
          p.freezeDuration = this.freezeDuration;
          
          this.game.projectiles.push(p);
      }
  }
  
  // Track hit enemies for pierce
  hitList: any[] = [];
  
  canHit(target: any): boolean {
      if (!this.hitList) return true;
      return !this.hitList.includes(target);
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    
    const velocity = this.velocity;
    const angle = Math.atan2(velocity.y, velocity.x);
    ctx.rotate(angle);

    const sprite = SpriteFactory.getSprite('projectile_torpedo');
    
    let scale = 2;
    if (this.isCritical) {
        scale = 3;
        ctx.shadowColor = 'red';
        ctx.shadowBlur = 10;
    }
    
    if (this.isGiant) {
        scale = 6; // MASSIVE
        ctx.shadowColor = 'orange';
        ctx.shadowBlur = 20;
    }
    
    if (this.freezeDuration > 0) {
        ctx.shadowColor = 'cyan';
        ctx.shadowBlur = 5;
    }
    
    ctx.drawImage(sprite, -sprite.width * scale / 2, -sprite.height * scale / 2, sprite.width * scale, sprite.height * scale);

    ctx.restore();
  }
}
