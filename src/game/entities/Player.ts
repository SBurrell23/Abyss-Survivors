import { Vector2 } from '../utils';
import { Game } from '../Game';
import { Projectile } from './Projectile';

export class Player {
  position: Vector2;
  velocity: Vector2;
  speed: number = 200; // Pixels per second
  radius: number = 15;
  hp: number = 100;
  maxHp: number = 100;
  damage: number = 10;
  game: Game;
  
  multiShotLevel: number = 0;
  magnetRadius: number = 100;

  shootCooldown: number = 0;
  attackInterval: number = 0.5; // Seconds between shots

  constructor(game: Game, x: number, y: number) {
    this.game = game;
    this.position = new Vector2(x, y);
    this.velocity = new Vector2(0, 0);
  }

  update(dt: number) {
    const input = this.game.input;
    const moveDir = new Vector2(0, 0);

    if (input.keys['w'] || input.keys['ArrowUp']) moveDir.y -= 1;
    if (input.keys['s'] || input.keys['ArrowDown']) moveDir.y += 1;
    if (input.keys['a'] || input.keys['ArrowLeft']) moveDir.x -= 1;
    if (input.keys['d'] || input.keys['ArrowRight']) moveDir.x += 1;

    const normalizedDir = moveDir.normalize();
    this.position.x += normalizedDir.x * this.speed * dt;
    this.position.y += normalizedDir.y * this.speed * dt;

    // Shooting Logic
    this.shootCooldown -= dt;
    if (this.shootCooldown <= 0) {
        this.shootNearestEnemy();
        this.shootCooldown = this.attackInterval;
    }
  }

  shootNearestEnemy() {
      let nearest = null;
      let minDst = Infinity;
      
      for (const enemy of this.game.enemies) {
          const dst = this.position.distanceTo(enemy.position);
          if (dst < minDst) {
              minDst = dst;
              nearest = enemy;
          }
      }

      if (nearest && minDst < 600) { // Range check
          const dir = nearest.position.sub(this.position).normalize();
          const speed = 400;
          
          // Base shot
          this.fireProjectile(dir, speed);

          // Multi-shot
          if (this.multiShotLevel > 0) {
             for (let i = 1; i <= this.multiShotLevel; i++) {
                 // Alternate angles: +15, -15, +30, -30 etc.
                 const angle = (Math.PI / 12) * i; // 15 degrees
                 
                 // Rotate dir vector
                 const cos = Math.cos(angle);
                 const sin = Math.sin(angle);
                 const dir1 = new Vector2(dir.x * cos - dir.y * sin, dir.x * sin + dir.y * cos);
                 
                 const cos2 = Math.cos(-angle);
                 const sin2 = Math.sin(-angle);
                 const dir2 = new Vector2(dir.x * cos2 - dir.y * sin2, dir.x * sin2 + dir.y * cos2);

                 this.fireProjectile(dir1, speed);
                 this.fireProjectile(dir2, speed);
             }
          }
      }
  }

  fireProjectile(dir: Vector2, speed: number) {
      const velocity = dir.scale(speed);
      const projectile = new Projectile(this.game, this.position.x, this.position.y, velocity);
      projectile.damage = this.damage;
      this.game.projectiles.push(projectile);
  }


  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    
    // Draw Submarine
    ctx.fillStyle = '#FFD700'; // Yellow submarine
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Periscope
    ctx.fillStyle = '#A9A9A9';
    ctx.fillRect(-5, -15, 4, 10);
    ctx.fillRect(-5, -17, 10, 4);

    ctx.restore();
  }

  takeDamage(amount: number) {
    this.hp -= amount;
    if (this.hp <= 0) {
        this.hp = 0;
        this.game.gameOver();
    }
  }
}

