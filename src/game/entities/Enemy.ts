import { Game } from '../Game';
import { Vector2 } from '../utils';
import { XPOrb } from './XPOrb';
import { SpriteFactory } from '../graphics/SpriteFactory';

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
  
  // Status Effects
  freezeTimer: number = 0;
  knockbackVelocity: Vector2 = new Vector2(0, 0);
  damageFlashTimer: number = 0;

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
    
    // Handle Damage Flash
    if (this.damageFlashTimer > 0) {
        this.damageFlashTimer -= dt;
    }
    
    // Handle Freeze
    let currentSpeed = this.stats.speed;
    if (this.freezeTimer > 0) {
        this.freezeTimer -= dt;
        currentSpeed *= 0.5; // 50% Slow
        // Optional: Full stun?
        // currentSpeed = 0; 
    }
    
    // Handle Knockback
    if (this.knockbackVelocity.length() > 5) {
        this.position.x += this.knockbackVelocity.x * dt;
        this.position.y += this.knockbackVelocity.y * dt;
        // Decay knockback
        this.knockbackVelocity = this.knockbackVelocity.scale(0.9); // Friction
    }
    
    // Basic movement towards player
    const dir = this.game.player.position.sub(this.position).normalize();
    
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
  
  applyKnockback(force: Vector2) {
      this.knockbackVelocity = this.knockbackVelocity.add(force);
  }
  
  freeze(duration: number) {
      this.freezeTimer = duration;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    
    // Visual effect for freeze
    if (this.freezeTimer > 0) {
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 10;
    }
    
    // Rotation based on movement direction (facing player)
    const dir = this.game.player.position.sub(this.position);
    
    const angle = Math.atan2(dir.y, dir.x);
    
    let rotationOffset = 0;
    if (this.stats.id.includes('squid')) rotationOffset = Math.PI / 2; 
    if (this.stats.id.includes('crab')) rotationOffset = Math.PI / 2; 
    if (this.stats.id.includes('ray')) rotationOffset = Math.PI / 2; 
    if (this.stats.id.includes('turtle')) rotationOffset = Math.PI / 2; 
    
    ctx.rotate(angle + rotationOffset);
    
    // Map stats.id or behavior to sprite
    let spriteName = 'enemy_fish';
    let paletteOverride = undefined;

    if (this.stats.id.includes('crab')) spriteName = 'enemy_crab';
    else if (this.stats.id.includes('squid')) spriteName = 'enemy_squid';
    else if (this.stats.id.includes('shark')) spriteName = 'enemy_shark';
    else if (this.stats.id.includes('ray')) spriteName = 'enemy_ray';
    else if (this.stats.id.includes('turtle')) spriteName = 'enemy_turtle';
    else if (this.stats.id.includes('horror')) spriteName = 'enemy_horror';
    
    paletteOverride = { 
        'R': this.stats.color, 
        'O': this.stats.color, 
        'P': this.stats.color,
    };
    
    if (['enemy_shark', 'enemy_ray', 'enemy_turtle', 'enemy_horror'].includes(spriteName)) {
        paletteOverride = undefined; 
    }

    const sprite = SpriteFactory.getSprite(spriteName, paletteOverride);
    const scale = (this.stats.radius * 2.5) / Math.max(sprite.width, sprite.height); 
    const spriteWidth = sprite.width * scale;
    const spriteHeight = sprite.height * scale;
    const spriteX = -spriteWidth / 2;
    const spriteY = -spriteHeight / 2;

    // Draw sprite normally
    ctx.drawImage(sprite, spriteX, spriteY, spriteWidth, spriteHeight);

    // Draw red flash overlay when taking damage (only on sprite pixels)
    if (this.damageFlashTimer > 0) {
        // Create a temporary canvas to generate a red flash mask
        const flashCanvas = document.createElement('canvas');
        flashCanvas.width = spriteWidth;
        flashCanvas.height = spriteHeight;
        const flashCtx = flashCanvas.getContext('2d')!;
        
        // Draw sprite to temp canvas
        flashCtx.drawImage(sprite, 0, 0, spriteWidth, spriteHeight);
        
        // Use 'source-atop' to create red version - draws red only where sprite pixels exist
        flashCtx.globalCompositeOperation = 'source-atop';
        flashCtx.fillStyle = 'rgba(255, 100, 100, 1)'; // Light red tint
        flashCtx.fillRect(0, 0, spriteWidth, spriteHeight);
        
        // Draw the red flash mask back to main canvas using 'lighter' blend mode
        // This adds a red tint to only the sprite pixels
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.5; // Flash intensity
        ctx.drawImage(flashCanvas, spriteX, spriteY);
        
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over'; // Reset to default
    }

    ctx.restore();
  }

  takeDamage(amount: number) {
      this.hp -= amount;
      this.damageFlashTimer = 0.1; // Flash for 0.1 seconds
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
