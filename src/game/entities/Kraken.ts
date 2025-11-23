import { Game } from '../Game';
import { Vector2 } from '../utils';
import { Projectile } from './Projectile';
import { Enemy } from './Enemy';

export class Kraken {
    game: Game;
    position: Vector2;
    radius: number = 100;
    hp: number = 5000;
    maxHp: number = 5000;
    active: boolean = true;
    
    attackTimer: number = 0;
    spawnTimer: number = 0;
    
    tentacles: {pos: Vector2, angle: number, length: number}[] = [];

    constructor(game: Game, x: number, y: number) {
        this.game = game;
        this.position = new Vector2(x, y);
        
        // Init tentacles
        for(let i=0; i<8; i++) {
            this.tentacles.push({
                pos: new Vector2(0,0),
                angle: (Math.PI * 2 / 8) * i,
                length: 150
            });
        }
    }

    update(dt: number) {
        // Movement (Float slightly)
        this.position.y += Math.sin(performance.now() / 1000) * 0.5;
        
        // Tentacle animation
        this.tentacles.forEach((t, i) => {
            t.angle += Math.sin(performance.now() / 500 + i) * 0.01;
        });
        
        // Logic
        this.attackTimer -= dt;
        if (this.attackTimer <= 0) {
            this.attack();
            this.attackTimer = 3.0;
        }
        
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnMinions();
            this.spawnTimer = 10.0;
        }
        
        // Collision with Player (Body Slam)
        if (this.position.distanceTo(this.game.player.position) < this.radius + this.game.player.radius) {
             this.game.player.takeDamage(20 * dt);
        }
    }
    
    attack() {
        // Shoot ink/projectiles in circle
        for(let i=0; i<12; i++) {
            const angle = (Math.PI * 2 / 12) * i;
            const dir = new Vector2(Math.cos(angle), Math.sin(angle));
            const proj = new Projectile(this.game, this.position.x, this.position.y, dir.scale(150));
            proj.damage = 20;
            proj.radius = 10;
            // Make it enemy projectile? Projectile class is shared?
            // Currently Projectile checks collision with enemies...
            // I need EnemyProjectile or flag.
            // For now, let's assume Projectile is Player's.
            // I might need to add `isEnemy` to Projectile or make a new class.
        }
        // Wait, Projectile class collides with Game.enemies.
        // I should add `isEnemyProjectile` flag to Projectile.
    }
    
    spawnMinions() {
        // Spawn random enemies around
        for(let i=0; i<3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 300;
            const pos = this.position.add(new Vector2(Math.cos(angle)*dist, Math.sin(angle)*dist));
            this.game.enemies.push(new Enemy(this.game, pos.x, pos.y, {
                id: 'squid', name: 'Minion', hp: 100, speed: 100, xp: 10, 
                score: 10, radius: 20, color: '#ff00ff'
            }));
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        
        // Draw Tentacles
        ctx.strokeStyle = '#4a148c'; // Purple
        ctx.lineWidth = 20;
        this.tentacles.forEach(t => {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            const endX = Math.cos(t.angle) * t.length;
            const endY = Math.sin(t.angle) * t.length;
            
            // Bezier for wiggle
            const midX = endX / 2 + Math.sin(performance.now()/200) * 20;
            const midY = endY / 2 + Math.cos(performance.now()/200) * 20;
            
            ctx.quadraticCurveTo(midX, midY, endX, endY);
            ctx.stroke();
        });

        // Body
        ctx.fillStyle = '#7b1fa2';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.ellipse(-30, -10, 15, 25, 0, 0, Math.PI * 2);
        ctx.ellipse(30, -10, 15, 25, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupils
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(-30, -10, 5, 0, Math.PI * 2);
        ctx.arc(30, -10, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    takeDamage(amount: number) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.active = false;
            this.game.winGame();
        }
    }
}

