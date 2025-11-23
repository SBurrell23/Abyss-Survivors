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
    
    // Rotation based on movement direction (facing player)
    const dir = this.game.player.position.sub(this.position);
    
    // Flip sprite based on direction
    // Most sprites face RIGHT by default.
    // Standard rotation is easier for top-down if they have a distinct "front"
    const angle = Math.atan2(dir.y, dir.x);
    
    // If the sprite is side-view (like fish usually are), we might want to just flip X
    // But our sprites are top-down-ish.
    // Actually, pixel art fish usually face Left or Right.
    // If we rotate them, they might look weird if they are side-profile.
    // Let's assume sprites face RIGHT (0 radians).
    
    // For side-profile sprites (fish, shark), rotation works if they are drawn top-down.
    // If they are side-view, rotation makes them swim on their side vertical.
    // Let's assume top-down view for everything.
    
    // However, if the user wants them to "face the right direction",
    // and they currently don't, maybe the sprite default orientation is wrong?
    // The sprites are drawn facing... well, let's check pixel data.
    // Fish: Nose is right (mostly).
    // Crab: Front is top? Or right?
    // Squid: Tentacles bottom.
    
    // Adjust rotation offset based on sprite type
    let rotationOffset = 0;
    if (this.stats.id.includes('squid')) rotationOffset = Math.PI / 2; // Squid faces up/down
    if (this.stats.id.includes('crab')) rotationOffset = Math.PI / 2; // Crab faces up/down
    if (this.stats.id.includes('ray')) rotationOffset = Math.PI / 2; // Ray faces up
    if (this.stats.id.includes('turtle')) rotationOffset = Math.PI / 2; // Turtle faces up
    
    // If it's a side-scroller sprite but used in top-down, we might just want to flip X
    // instead of rotating?
    // But "facing the player" implies rotation for 360 movement.
    
    ctx.rotate(angle + rotationOffset);
    
    // Fix for upside down sprites when moving left?
    // If we just rotate, they turn upside down.
    // To prevent upside down rendering:
    // if (Math.abs(angle) > Math.PI / 2) ctx.scale(1, -1);
    // But that depends on the sprite symmetry.

    // Map stats.id or behavior to sprite
    let spriteName = 'enemy_fish';
    let paletteOverride = undefined;

    if (this.stats.id.includes('crab')) spriteName = 'enemy_crab';
    else if (this.stats.id.includes('squid')) spriteName = 'enemy_squid';
    else if (this.stats.id.includes('shark')) spriteName = 'enemy_shark';
    else if (this.stats.id.includes('ray')) spriteName = 'enemy_ray';
    else if (this.stats.id.includes('turtle')) spriteName = 'enemy_turtle';
    else if (this.stats.id.includes('horror')) spriteName = 'enemy_horror';
    
    // Tint based on stats.color
    // We can override the main color in the palette
    // Most sprites use 'R' or 'O' or 'P' or 'G' or 'B' as main body
    paletteOverride = { 
        'R': this.stats.color, 
        'O': this.stats.color, 
        'P': this.stats.color,
        // 'G': this.stats.color, // Sharks use G, but we might want to keep them grey? Or tint them slightly?
        // 'B': this.stats.color // Rays use B
    };
    
    // If unique sprite exists, use its native colors unless overridden explicitly
    // For fish/crabs, we want tinting. For detailed sprites like shark, maybe keep original?
    // Let's only apply tint to generic ones or small ones.
    if (['enemy_shark', 'enemy_ray', 'enemy_turtle', 'enemy_horror'].includes(spriteName)) {
        paletteOverride = undefined; // Use defined palette
    }

    const sprite = SpriteFactory.getSprite(spriteName, paletteOverride);
    // Adjust scale based on sprite native size vs target radius
    // Sprite is drawn centered. 
    // Target diameter = radius * 2. 
    // We want sprite to cover roughly the diameter.
    // sprite.width * scale = radius * 2
    // scale = (radius * 2) / sprite.width
    const scale = (this.stats.radius * 2.5) / Math.max(sprite.width, sprite.height); 

    ctx.drawImage(sprite, -sprite.width * scale / 2, -sprite.height * scale / 2, sprite.width * scale, sprite.height * scale);

    ctx.restore();
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
