import { Game } from '../Game';
import { Vector2 } from '../utils';

export class DepthCharge {
    game: Game;
    position: Vector2;
    velocity: Vector2;
    radius: number = 20;
    damage: number = 100;
    active: boolean = true;
    
    constructor(game: Game, x: number, y: number) {
        this.game = game;
        this.position = new Vector2(x, y);
        this.velocity = new Vector2(0, 100); // Slow down
    }
    
    update(dt: number) {
        this.position.y += this.velocity.y * dt;
        
        // Despawn if too far
        if (this.position.y > this.game.camera.y + this.game.canvas.height + 100) {
            this.active = false;
        }
    }
    
    draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ff0000'; // Red light
        ctx.beginPath();
        ctx.arc(5, -5, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    explode() {
        this.active = false;
        this.game.createExplosion(this.position, 150, this.damage);
    }
}
