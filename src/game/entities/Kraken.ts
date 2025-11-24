import { Game } from '../Game';
import { Vector2 } from '../utils';
import { Enemy, MonsterStats } from './Enemy';
import monstersData from '../data/monsters.json';

export class Kraken {
    game: Game;
    position: Vector2;
    radius: number = 100;
    hp: number = 15000; // Phase 1 HP
    maxHp: number = 15000; // Current phase max HP
    active: boolean = true;
    
    spawnTimer: number = 0;
    phase: number = 1; // Boss phases: 1, 2, 3
    
    // Phase HP values
    phase1Hp: number = 15000;
    phase2Hp: number = 20000;
    phase3Hp: number = 30000;
    
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
        // Update tentacle lengths based on phase
        const baseLength = 150;
        const phaseLengthMultiplier = this.phase === 1 ? 1.0 : 
                                     this.phase === 2 ? 1.8 : 
                                     2.5; // Much longer in later phases
        this.tentacles.forEach(t => {
            t.length = baseLength * phaseLengthMultiplier;
        });
        
        // Movement (Float slightly, more aggressive in later phases)
        const floatSpeed = 0.5 + (this.phase - 1) * 0.5;
        this.position.y += Math.sin(performance.now() / 1000) * floatSpeed;
        
        // Move towards player (faster in each phase)
        const dir = this.game.player.position.sub(this.position).normalize();
        const moveSpeed = this.phase === 1 ? 40 : 
                         this.phase === 2 ? 70 : 
                         110; // Much faster in each phase
        this.position = this.position.add(dir.scale(moveSpeed * dt));
        
        // Tentacle animation - faster in later phases
        this.tentacles.forEach((t, i) => {
            t.angle += Math.sin(performance.now() / 500 + i) * (0.01 + (this.phase - 1) * 0.02);
        });
        
        // Spawn minions much more frequently in later phases
        const spawnCooldown = this.phase === 1 ? 10.0 : 
                             this.phase === 2 ? 4.0 : 
                             2.5; // Much more frequent
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnMinions();
            this.spawnTimer = spawnCooldown;
        }
        
        // Collision with Player (Body Slam) - much more damage in later phases
        if (this.position.distanceTo(this.game.player.position) < this.radius + this.game.player.radius) {
             const damage = this.phase === 1 ? 20 : 
                           this.phase === 2 ? 50 : 
                           80; // Much more damage
             this.game.player.takeDamage(damage * dt);
        }
    }
    
    attack() {
        // No projectiles - Kraken only uses tentacles and body slams
        // This method is kept for potential future use but does nothing now
    }
    
    spawnMinions() {
        // Spawn many more minions in later phases
        const minionCount = this.phase === 1 ? 3 : 
                           this.phase === 2 ? 8 : 
                           12; // Much more minions
        
        const monsters = monstersData as MonsterStats[];
        const arenaBounds = this.game.arenaBounds;
        
        for(let i=0; i<minionCount; i++) {
            let pos: Vector2;
            let attempts = 0;
            
            // Spawn outside arena bounds
            do {
                const angle = Math.random() * Math.PI * 2;
                // Spawn far enough outside the arena
                const dist = 400 + Math.random() * 300; // 400-700 pixels from kraken
                pos = this.position.add(new Vector2(Math.cos(angle)*dist, Math.sin(angle)*dist));
                attempts++;
            } while (arenaBounds && 
                     pos.x >= arenaBounds.minX && pos.x <= arenaBounds.maxX &&
                     pos.y >= arenaBounds.minY && pos.y <= arenaBounds.maxY &&
                     attempts < 20); // Safety limit
            
            // Choose monster type based on phase
            let monsterType: MonsterStats;
            if (this.phase === 1) {
                // Phase 1: Squid
                monsterType = monsters.find(m => m.id === 'squid') || monsters[5];
            } else if (this.phase === 2) {
                // Phase 2: Shark or Turtle (random)
                const hardMonsters = monsters.filter(m => m.id === 'shark' || m.id === 'turtle');
                monsterType = hardMonsters[Math.floor(Math.random() * hardMonsters.length)] || monsters[6];
            } else {
                // Phase 3: Abyss Horror or Shark (random)
                const hardestMonsters = monsters.filter(m => m.id === 'abyss_horror' || m.id === 'shark');
                monsterType = hardestMonsters[Math.floor(Math.random() * hardestMonsters.length)] || monsters[9];
            }
            
            // Boost stats for boss fight minions
            const boostedStats: MonsterStats = {
                ...monsterType,
                hp: monsterType.hp * (this.phase === 1 ? 1.0 : this.phase === 2 ? 1.5 : 2.0),
                speed: monsterType.speed * (this.phase === 1 ? 1.0 : this.phase === 2 ? 1.3 : 1.6)
            };
            
            this.game.enemies.push(new Enemy(this.game, pos.x, pos.y, boostedStats));
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        
        // Tentacles get more aggressive in later phases
        const tentacleSpeed = 200 - (this.phase - 1) * 50; // Faster movement
        const tentacleWidth = 20 + (this.phase - 1) * 5; // Thicker tentacles
        
        // Draw Tentacles - more aggressive in later phases
        const tentacleColor = this.phase === 1 ? '#4a148c' : 
                             this.phase === 2 ? '#6a1b9a' : '#8b0000'; // Darker/redder
        ctx.strokeStyle = tentacleColor;
        ctx.lineWidth = tentacleWidth;
        this.tentacles.forEach((t, i) => {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            const endX = Math.cos(t.angle) * t.length;
            const endY = Math.sin(t.angle) * t.length;
            
            // More aggressive wiggle in later phases
            const wiggleAmount = 20 + (this.phase - 1) * 15;
            const midX = endX / 2 + Math.sin(performance.now()/tentacleSpeed + i) * wiggleAmount;
            const midY = endY / 2 + Math.cos(performance.now()/tentacleSpeed + i) * wiggleAmount;
            
            ctx.quadraticCurveTo(midX, midY, endX, endY);
            ctx.stroke();
        });

        // Body - gets darker/redder as phases increase
        const bodyColor = this.phase === 1 ? '#7b1fa2' : 
                         this.phase === 2 ? '#9c1fa2' : '#ad1f00';
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Glow effect in later phases
        if (this.phase >= 2) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = this.phase === 2 ? '#ff5722' : '#ff0000';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        
        // Eyes - get bigger and angrier
        const eyeSizeX = 15 + (this.phase - 1) * 5;
        const eyeSizeY = 25 + (this.phase - 1) * 5;
        const eyeColor = this.phase === 1 ? 'yellow' : 
                        this.phase === 2 ? '#ffaa00' : '#ff0000'; // Orange -> Red
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.ellipse(-30, -10, eyeSizeX, eyeSizeY, 0, 0, Math.PI * 2);
        ctx.ellipse(30, -10, eyeSizeX, eyeSizeY, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupils - get smaller and more focused (angrier look)
        const pupilSize = 5 - (this.phase - 1) * 1;
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(-30, -10, pupilSize, 0, Math.PI * 2);
        ctx.arc(30, -10, pupilSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Angry eyebrows/scars in phase 2+
        if (this.phase >= 2) {
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            // Angry eyebrows
            ctx.moveTo(-45, -25);
            ctx.lineTo(-35, -20);
            ctx.moveTo(35, -20);
            ctx.lineTo(45, -25);
            ctx.stroke();
        }
        
        // Phase 3: Red veins/glow
        if (this.phase >= 3) {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            for(let i=0; i<6; i++) {
                const angle = (Math.PI * 2 / 6) * i;
                const startX = Math.cos(angle) * (this.radius * 0.7);
                const startY = Math.sin(angle) * (this.radius * 0.7);
                const endX = Math.cos(angle) * this.radius;
                const endY = Math.sin(angle) * this.radius;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }
        
        ctx.restore();
    }
    
    takeDamage(amount: number) {
        this.hp -= amount;
        if (this.hp <= 0) {
            // Advance to next phase or win
            if (this.phase === 1) {
                // Phase 1 complete, start Phase 2
                this.phase = 2;
                this.maxHp = this.phase2Hp;
                this.hp = this.phase2Hp;
                // Reset timer
                this.spawnTimer = 0;
            } else if (this.phase === 2) {
                // Phase 2 complete, start Final Phase
                this.phase = 3;
                this.maxHp = this.phase3Hp;
                this.hp = this.phase3Hp;
                // Reset timer
                this.spawnTimer = 0;
            } else {
                // Final Phase complete - win!
                this.hp = 0;
                this.active = false;
                this.game.winGame();
            }
        }
    }
}

