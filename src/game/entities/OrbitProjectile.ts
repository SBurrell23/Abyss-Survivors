import { Game } from '../Game';
import { Vector2 } from '../utils';
import { Projectile } from './Projectile';

export class OrbitProjectile extends Projectile {
  angle: number = 0;
  orbitRadius: number = 60;
  orbitSpeed: number = 3;
  
  isRecovering: boolean = false;
  recoveryTime: number = 2.0;
  currentRecovery: number = 0;

  constructor(game: Game, angleOffset: number) {
    super(game, 0, 0, new Vector2(0,0));
    this.angle = angleOffset;
    this.radius = 8;
    this.damage = 5; 
    this.duration = Infinity;
  }

  update(dt: number) {
    // Handle recovery
    if (this.isRecovering) {
        this.currentRecovery -= dt;
        if (this.currentRecovery <= 0) {
            this.isRecovering = false;
        }
    }

    this.angle += this.orbitSpeed * dt;
    const playerPos = this.game.player.position;
    
    this.position.x = playerPos.x + Math.cos(this.angle) * this.orbitRadius;
    this.position.y = playerPos.y + Math.sin(this.angle) * this.orbitRadius;
  }

  onHit(_target: any) {
     this.isRecovering = true;
     this.currentRecovery = this.recoveryTime;
     // Do NOT set active = false
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.isRecovering) return; // Invisible while recovering

    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    
    ctx.fillStyle = '#00ffaa';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

