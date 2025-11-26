import { Game } from '../Game';
import { Vector2 } from '../utils';

export class Obstacle {
    game: Game;
    position: Vector2;
    radius: number;
    active: boolean = true;
    type: 'rock' | 'coral' | 'tentacle_barrier' | 'seaweed';
    slowsMovement: boolean = false; // For seaweed
    armCount: number = 4; // For coral obstacles
    colorIndex: number = 0; // For coral color assignment

    constructor(game: Game, x: number, y: number, radius: number, type: 'rock' | 'coral' | 'tentacle_barrier' | 'seaweed' = 'rock', colorIndex: number = 0) {
        this.game = game;
        this.position = new Vector2(x, y);
        this.radius = radius;
        this.type = type;
        this.slowsMovement = type === 'seaweed';
        this.colorIndex = colorIndex;
        
        // Random arm count for coral (3-6)
        if (type === 'coral') {
            this.armCount = 3 + Math.floor(Math.random() * 4);
        }
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
            // Floating coral with arms - use stored armCount (3-6)
            
            // Coral colors: off-white/eggshell or other coral colors
            const coralColors = [
                '#F5F5DC', // Off-white/eggshell (was dark purple)
                '#7b1fa2', // Purple
                '#2E8B57', // Sea-green (was dark red/black)
                '#A52A2A', // Brown red
                '#FF1493', // Deep pink
                '#FF6347'  // Tomato/coral
            ];
            // Use stored colorIndex for even distribution
            const baseColor = coralColors[this.colorIndex % coralColors.length];
            
            // Ensure we have a valid color (fallback to sea-green if somehow undefined)
            const finalColor = baseColor || '#2E8B57';
            
            // Draw center body
            ctx.fillStyle = finalColor;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw arms (tentacle-like) - doubled length
            const time = performance.now() / 800; // Slower animation
            ctx.strokeStyle = finalColor;
            ctx.lineWidth = 4;
            ctx.fillStyle = finalColor;
            
            for(let i=0; i<this.armCount; i++) {
                const angle = (Math.PI * 2 / this.armCount) * i + Math.sin(time + i) * 0.2;
                const armLength = this.radius * 4 * (0.8 + (i % 3) * 0.15); // Quadrupled arm length (doubled again)
                const endX = Math.cos(angle) * armLength;
                const endY = Math.sin(angle) * armLength;
                
                // Draw arm as a line with slight curve
                ctx.beginPath();
                ctx.moveTo(0, 0);
                const midX = Math.cos(angle) * armLength * 0.5 + Math.sin(time + i) * 5;
                const midY = Math.sin(angle) * armLength * 0.5;
                ctx.quadraticCurveTo(midX, midY, endX, endY);
                ctx.stroke();
                
                // Small tip at end
                ctx.beginPath();
                ctx.arc(endX, endY, 3, 0, Math.PI * 2);
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

