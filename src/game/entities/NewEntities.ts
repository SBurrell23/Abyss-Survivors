import { Game } from '../Game';
import { Vector2 } from '../utils';

export class DepthCharge {
    game: Game;
    position: Vector2;
    velocity: Vector2;
    radius: number = 12; // Reduced from 20 to make bombs smaller
    damage: number = 100;
    active: boolean = true;
    fuseTimer: number = 0;
    
    constructor(game: Game, x: number, y: number) {
        this.game = game;
        this.position = new Vector2(x, y);
        this.velocity = new Vector2(0, 100); // Slow down
    }
    
    update(dt: number) {
        this.position.y += this.velocity.y * dt;
        this.fuseTimer += dt;
        
        // Despawn if too far
        if (this.position.y > this.game.camera.y + this.game.canvas.height + 100) {
            this.active = false;
        }
    }
    
    draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        
        // Bomb body
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(0, 5, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.arc(-5, 0, this.radius/3, 0, Math.PI * 2);
        ctx.fill();
        
        // Fuse stem
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, -this.radius + 5);
        ctx.lineTo(0, -this.radius - 5);
        ctx.stroke();

        // Fuse spark
        if (Math.floor(this.fuseTimer * 10) % 2 === 0) {
             ctx.fillStyle = '#ffaa00';
             ctx.beginPath();
             ctx.arc(0, -this.radius - 5, 3, 0, Math.PI * 2);
             ctx.fill();
        }
        
        ctx.restore();
    }
    
    explode() {
        this.active = false;
        this.game.createExplosion(this.position, 150, this.damage);
    }
}
