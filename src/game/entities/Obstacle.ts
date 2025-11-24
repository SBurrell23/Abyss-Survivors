import { Game } from '../Game';
import { Vector2 } from '../utils';

export class Obstacle {
    game: Game;
    position: Vector2;
    radius: number;
    active: boolean = true;
    type: 'rock' | 'coral' | 'tentacle_barrier' | 'seaweed';
    slowsMovement: boolean = false; // For seaweed

    constructor(game: Game, x: number, y: number, radius: number, type: 'rock' | 'coral' | 'tentacle_barrier' | 'seaweed' = 'rock') {
        this.game = game;
        this.position = new Vector2(x, y);
        this.radius = radius;
        this.type = type;
        this.slowsMovement = type === 'seaweed';
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;
        
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        
        if (this.type === 'rock') {
            // More realistic rock formation with multiple layers and texture
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
            gradient.addColorStop(0, '#3a3a3a');
            gradient.addColorStop(0.5, '#2a2a2a');
            gradient.addColorStop(1, '#1a1a1a');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Add rock texture with smaller rocks
            ctx.fillStyle = '#4a4a4a';
            for(let i=0; i<5; i++) {
                const angle = (Math.PI * 2 / 5) * i;
                const dist = this.radius * (0.3 + Math.random() * 0.4);
                const x = Math.cos(angle) * dist;
                const y = Math.sin(angle) * dist;
                const size = this.radius * 0.2;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Add cracks/shadow
            ctx.strokeStyle = '#1a1a1a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-this.radius * 0.6, -this.radius * 0.3);
            ctx.lineTo(this.radius * 0.4, this.radius * 0.5);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this.radius * 0.3, -this.radius * 0.5);
            ctx.lineTo(-this.radius * 0.5, this.radius * 0.4);
            ctx.stroke();
        } else if (this.type === 'coral') {
            // Spiky coral formation
            ctx.fillStyle = '#8B0000'; // Dark red
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Spikes
            ctx.fillStyle = '#A52A2A';
            for(let i=0; i<8; i++) {
                const angle = (Math.PI * 2 / 8) * i;
                const spikeX = Math.cos(angle) * this.radius;
                const spikeY = Math.sin(angle) * this.radius;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(spikeX, spikeY);
                ctx.lineTo(spikeX * 1.3, spikeY * 1.3);
                ctx.closePath();
                ctx.fill();
            }
        } else if (this.type === 'tentacle_barrier') {
            // Animated tentacle barrier - longer tentacles
            const time = performance.now() / 500;
            ctx.strokeStyle = '#4a148c';
            ctx.lineWidth = 15;
            for(let i=0; i<4; i++) {
                const angle = (Math.PI * 2 / 4) * i + Math.sin(time + i) * 0.3;
                const endX = Math.cos(angle) * this.radius;
                const endY = Math.sin(angle) * this.radius;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        } else if (this.type === 'seaweed') {
            // Small wavy seaweed patches throughout the arena (slow animation like tentacles)
            const time = performance.now() / 500; // Same speed as tentacle barriers
            ctx.strokeStyle = '#2e7d32'; // Dark green
            ctx.lineWidth = 5;
            
            // Draw 3-5 wavy strands in a small patch
            const strandCount = 3 + Math.floor(Math.random() * 3); // 3-5 strands
            const strandHeight = 50 + Math.random() * 40; // 50-90 pixels tall
            const strandSpacing = 10; // Space between strands
            
            for(let i=0; i<strandCount; i++) {
                const offsetX = (i - (strandCount-1)/2) * strandSpacing;
                
                ctx.beginPath();
                ctx.moveTo(offsetX, 0);
                
                // Draw wavy strand using quadratic curve (like tentacles)
                const endX = offsetX + Math.sin(time + i) * 12; // Wavy end
                const endY = -strandHeight;
                
                // Wavy midpoint
                const midX = offsetX / 2 + Math.sin(time + i + 1) * 15;
                const midY = -strandHeight / 2;
                
                // Use quadratic curve for smooth wavy motion (like tentacle barriers)
                ctx.quadraticCurveTo(midX, midY, endX, endY);
                ctx.stroke();
            }
        }
        
        ctx.restore();
    }
}

