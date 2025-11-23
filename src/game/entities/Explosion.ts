import { Game } from '../Game';
import { Vector2 } from '../utils';

export class Explosion {
    game: Game;
    position: Vector2;
    radius: number;
    maxRadius: number;
    duration: number = 0.5;
    timeAlive: number = 0;
    active: boolean = true;
    color: string;

    constructor(game: Game, x: number, y: number, radius: number, color: string = '#FFA500') {
        this.game = game;
        this.position = new Vector2(x, y);
        this.maxRadius = radius;
        this.radius = 0;
        this.color = color;
    }

    update(dt: number) {
        this.timeAlive += dt;
        const progress = this.timeAlive / this.duration;
        
        if (progress >= 1) {
            this.active = false;
            return;
        }

        // Expand then fade
        this.radius = this.maxRadius * Math.sin(progress * Math.PI);
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;
        
        ctx.save();
        ctx.globalAlpha = 1 - (this.timeAlive / this.duration);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Shockwave
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius * 0.8, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }
}

