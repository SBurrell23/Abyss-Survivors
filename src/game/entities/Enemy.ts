import { Game } from '../Game';
import { Vector2 } from '../utils';
import { XPOrb } from './XPOrb';

export interface MonsterStats {
  id: string;
  name: string;
  hp: number;
  speed: number;
  radius: number;
  color: string;
  xp: number;
  score: number;
  behavior?: string;
}

export class Enemy {
  game: Game;
  position: Vector2;
  active: boolean = true;
  
  stats: MonsterStats;
  hp: number;
  
  // Animation state
  animTime: number = 0;

  constructor(game: Game, x: number, y: number, stats?: MonsterStats) {
    this.game = game;
    this.position = new Vector2(x, y);
    
    // Default stats if none provided (legacy support or fallback)
    this.stats = stats || {
      id: 'default',
      name: 'Fish',
      hp: 10,
      speed: 80,
      radius: 12,
      color: '#ff4444',
      xp: 10,
      score: 10
    };
    
    this.hp = this.stats.hp;
  }

  update(dt: number) {
    this.animTime += dt;
    
    // Basic movement towards player
    const dir = this.game.player.position.sub(this.position).normalize();
    
    let currentSpeed = this.stats.speed;
    
    // Basic Behavior Variations
    if (this.stats.behavior === 'snake') {
       // Wiggle perpendicular to direction
       const wiggle = Math.sin(this.animTime * 10) * 0.5;
       const perp = new Vector2(-dir.y, dir.x);
       this.position.x += (dir.x + perp.x * wiggle) * currentSpeed * dt;
       this.position.y += (dir.y + perp.y * wiggle) * currentSpeed * dt;
    } else if (this.stats.behavior === 'crab') {
        // Stop and go
        const cycle = this.animTime % 1.5;
        if (cycle < 0.5) currentSpeed = 0;
        this.position.x += dir.x * currentSpeed * dt;
        this.position.y += dir.y * currentSpeed * dt;
    } else {
        // Default Chase
        this.position.x += dir.x * currentSpeed * dt;
        this.position.y += dir.y * currentSpeed * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    
    ctx.fillStyle = this.stats.color;
    
    // Rotation based on movement direction (facing player)
    const dir = this.game.player.position.sub(this.position);
    const angle = Math.atan2(dir.y, dir.x);
    ctx.rotate(angle);

    this.drawShape(ctx);

    ctx.restore();
  }

  drawShape(ctx: CanvasRenderingContext2D) {
      const r = this.stats.radius;
      
      ctx.beginPath();
      
      if (this.stats.id === 'crab') {
          ctx.ellipse(0, 0, r, r*0.8, 0, 0, Math.PI*2);
          ctx.fill();
          // Claws
          ctx.beginPath(); ctx.arc(r, -r/2, r/2, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(r, r/2, r/2, 0, Math.PI*2); ctx.fill();
      } else if (this.stats.id === 'shark' || this.stats.id === 'fish_medium') {
          // Triangle-ish fish
          ctx.moveTo(r, 0);
          ctx.lineTo(-r, r);
          ctx.lineTo(-r, -r);
          ctx.fill();
          // Tail
          ctx.beginPath();
          ctx.moveTo(-r, 0);
          ctx.lineTo(-r - 5, 5);
          ctx.lineTo(-r - 5, -5);
          ctx.fill();
      } else if (this.stats.id === 'ray') {
          // Diamond/Kite
          ctx.moveTo(r, 0);
          ctx.lineTo(0, r);
          ctx.lineTo(-r, 0);
          ctx.lineTo(0, -r);
          ctx.fill();
      } else if (this.stats.id === 'squid') {
          // Elongated
          ctx.ellipse(0, 0, r, r/2, 0, 0, Math.PI*2);
          ctx.fill();
          // Tentacles trailing
          ctx.strokeStyle = this.stats.color;
          ctx.lineWidth = 2;
          for(let i=-2; i<=2; i++) {
              ctx.beginPath();
              ctx.moveTo(0, i*4);
              ctx.lineTo(-r*1.5, i*4 + Math.sin(this.animTime*10 + i)*5);
              ctx.stroke();
          }
      } else {
          // Default Circle/Blob
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
      }
  }

  takeDamage(amount: number) {
      this.hp -= amount;
      if (this.hp <= 0) {
          this.active = false;
          this.game.score += this.stats.score;
          this.game.xpOrbs.push(new XPOrb(this.game, this.position.x, this.position.y, this.stats.xp));
      }
  }
  
  get radius(): number {
      return this.stats.radius;
  }
}
