import { Game } from '../Game';
import { Vector2 } from '../utils';
import { Enemy, MonsterStats } from './Enemy';
import monstersData from '../data/monsters.json';
import { SpriteFactory } from '../graphics/SpriteFactory';

export class Kraken {
    game: Game;
    position: Vector2;
    radius: number = 100;
    hp: number = 15000; // Phase 1 HP
    maxHp: number = 15000; // Current phase max HP
    active: boolean = true;
    isKraken: boolean = true; // Flag to identify Kraken (immune to knockback)
    
    spawnTimer: number = 0;
    phase: number = 1; // Boss phases: 1, 2, 3
    
    // Phase HP values
    phase1Hp: number = 15000;
    phase2Hp: number = 20000;
    phase3Hp: number = 30000;
    
    tentacles: {pos: Vector2, angle: number, length: number}[] = [];
    
    // Damage cap system: max 49 HP per 100ms window (490 HP per second equivalent)
    damageCapPerWindow: number = 49;
    damageThisWindow: number = 0;
    damageTimer: number = 0;
    damageWindowDuration: number = 0.1; // 100ms window

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
        // Reset damage counter every 100ms window
        this.damageTimer += dt;
        if (this.damageTimer >= this.damageWindowDuration) {
            this.damageThisWindow = 0;
            this.damageTimer = 0;
        }
        
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
        const spawnCooldown = this.phase === 1 ? 8.0 : 
                             this.phase === 2 ? 3.0 : 
                             1.8; // Slightly increased spawn rate
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
        
        // Tentacle collision with player
        this.checkTentacleCollision(dt);
    }
    
    checkTentacleCollision(dt: number) {
        const tentacleWidth = 20 + (this.phase - 1) * 5; // Same as draw width
        const tentacleRadius = tentacleWidth / 2; // Half width for collision
        const playerPos = this.game.player.position;
        const playerRadius = this.game.player.radius;
        
        // Tentacle damage scales with phase
        const tentacleDamage = this.phase === 1 ? 15 : 
                              this.phase === 2 ? 30 : 
                              50; // More damage in later phases
        
        // Check each tentacle
        this.tentacles.forEach((t, i) => {
            // Calculate tentacle points in world space
            const startX = this.position.x;
            const startY = this.position.y;
            const endX = this.position.x + Math.cos(t.angle) * t.length;
            const endY = this.position.y + Math.sin(t.angle) * t.length;
            
            // Calculate midpoint with wiggle (same as draw)
            const tentacleSpeed = 200 - (this.phase - 1) * 50;
            const wiggleAmount = 20 + (this.phase - 1) * 15;
            const midX = this.position.x + (endX - startX) / 2 + Math.sin(performance.now()/tentacleSpeed + i) * wiggleAmount;
            const midY = this.position.y + (endY - startY) / 2 + Math.cos(performance.now()/tentacleSpeed + i) * wiggleAmount;
            
            // Check collision by sampling points along the tentacle curve
            // Sample multiple points along the quadratic curve
            const samples = 10; // Number of points to check
            for (let j = 0; j <= samples; j++) {
                const t_param = j / samples; // 0 to 1
                
                // Calculate point on quadratic curve: (1-t)^2*P0 + 2*(1-t)*t*P1 + t^2*P2
                const px = (1 - t_param) * (1 - t_param) * startX + 
                          2 * (1 - t_param) * t_param * midX + 
                          t_param * t_param * endX;
                const py = (1 - t_param) * (1 - t_param) * startY + 
                          2 * (1 - t_param) * t_param * midY + 
                          t_param * t_param * endY;
                
                // Check distance from player to this point on tentacle
                const dist = Math.sqrt((playerPos.x - px) ** 2 + (playerPos.y - py) ** 2);
                
                if (dist < tentacleRadius + playerRadius) {
                    // Player is touching this tentacle
                    this.game.player.takeDamage(tentacleDamage * dt);
                    return; // Only damage once per tentacle per frame
                }
            }
        });
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
        const minDistanceFromPlayer = 800; // Minimum distance from player in pixels
        
        for(let i=0; i<minionCount; i++) {
            let pos: Vector2 = new Vector2(0, 0); // Initialize to avoid TS error
            let attempts = 0;
            let validPos = false;
            
            // Spawn outside arena bounds and away from player
            // Try to spawn at a good distance from player first
            while (!validPos && attempts < 100) {
                // Try spawning at a distance from player (preferred method)
                const playerAngle = Math.random() * Math.PI * 2;
                const playerDist = minDistanceFromPlayer + Math.random() * 400; // 800-1200 pixels from player
                pos = this.game.player.position.add(new Vector2(Math.cos(playerAngle) * playerDist, Math.sin(playerAngle) * playerDist));
                
                // Check if position is valid
                const tooCloseToPlayer = pos.distanceTo(this.game.player.position) < minDistanceFromPlayer;
                const insideArena = arenaBounds && 
                                   pos.x >= arenaBounds.minX && pos.x <= arenaBounds.maxX &&
                                   pos.y >= arenaBounds.minY && pos.y <= arenaBounds.maxY;
                
                if (!tooCloseToPlayer && !insideArena) {
                    validPos = true;
                }
                
                attempts++;
            }
            
            // If we couldn't find a valid position, skip this minion
            if (!validPos) {
                continue;
            }
            
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

        // Draw Body using Pixel Sprite
        // Define palette based on phase
        let paletteOverride: Record<string, string> | undefined;
        
        if (this.phase === 1) {
            paletteOverride = {
                'M': '#7b1fa2', // Purple
                'D': '#4a148c', // Dark Purple
                'L': '#ae52d4', // Light Purple
                'S': '#4a0072', // Spots
                'E': '#FFFF00', // Yellow Eye
                'P': 'black'
            };
        } else if (this.phase === 2) {
            paletteOverride = {
                'M': '#9c1fa2', // Red-Purple
                'D': '#6a1b9a', 
                'L': '#d05ce3',
                'S': '#6a0080',
                'E': '#ffaa00', // Orange Eye
                'P': 'black'
            };
        } else {
            // Phase 3: Red/Hellish
            paletteOverride = {
                'M': '#b71c1c', // Red
                'D': '#7f0000', // Dark Red
                'L': '#f05545', // Light Red
                'S': '#560027', // Darker spots
                'E': '#ff0000', // Red Eye
                'P': '#400000'  // Dark Pupil
            };
        }
        
        // Glow effect in later phases
        if (this.phase >= 2) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = this.phase === 2 ? '#ff5722' : '#ff0000';
        }
        
        const sprite = SpriteFactory.getSprite('boss_kraken', paletteOverride);
        
        // Scale sprite to match radius (radius is 100px)
        // Sprite is 32x32. We want it to cover roughly radius*2
        const scale = (this.radius * 2.2) / sprite.width;
        
        const spriteW = sprite.width * scale;
        const spriteH = sprite.height * scale;
        
        ctx.drawImage(sprite, -spriteW/2, -spriteH/2, spriteW, spriteH);
        
        // Reset shadow
        ctx.shadowBlur = 0;

        // Phase 3: Red veins/glow overlay (optional extra detail)
        if (this.phase >= 3) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.3;
            ctx.drawImage(sprite, -spriteW/2, -spriteH/2, spriteW, spriteH);
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'source-over';
        }
        
        ctx.restore();
    }
    
    takeDamage(amount: number, bypassCap: boolean = false) {
        let cappedDamage = amount;
        
        if (!bypassCap) {
            // Apply damage cap: max 49 HP per 100ms window
            const remainingDamageBudget = this.damageCapPerWindow - this.damageThisWindow;
            
            if (remainingDamageBudget <= 0) {
                // Already hit damage cap this window, ignore this damage
                return;
            } else if (amount > remainingDamageBudget) {
                // Exceeds remaining budget, cap it
                cappedDamage = remainingDamageBudget;
            }
            
            // Update damage tracking
            this.damageThisWindow += cappedDamage;
        }
        
        const actualDamage = Math.min(cappedDamage, this.hp); // Don't count overkill
        this.game.totalDamageDealt += actualDamage;
        
        this.hp -= cappedDamage;
        if (this.hp <= 0) {
            // Advance to next phase or win
            if (this.phase === 1) {
                // Phase 1 complete, start Phase 2
                this.phase = 2;
                this.maxHp = this.phase2Hp;
                this.hp = this.phase2Hp;
                // Reset timer
                this.spawnTimer = 0;
                // Reset damage cap counter
                this.damageThisWindow = 0;
                this.damageTimer = 0;
                // Play phase change roar (reduced by 35% + 25% = 60% total)
                this.game.soundManager.playKrakenRoar(0.34125);
            } else if (this.phase === 2) {
                // Phase 2 complete, start Final Phase
                this.phase = 3;
                this.maxHp = this.phase3Hp;
                this.hp = this.phase3Hp;
                // Reset timer
                this.spawnTimer = 0;
                // Reset damage cap counter
                this.damageThisWindow = 0;
                this.damageTimer = 0;
                // Play phase change roar (reduced by 35% + 25% = 60% total)
                this.game.soundManager.playKrakenRoar(0.39);
            } else {
                // Final Phase complete - win!
                this.hp = 0;
                this.active = false;
                this.game.winGame();
            }
        }
    }
}

