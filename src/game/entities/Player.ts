import { Vector2 } from '../utils';
import { Game } from '../Game';
import { Projectile } from './Projectile';
import { DepthCharge } from './NewEntities';

export class Player {
  position: Vector2;
  velocity: Vector2;
  speed: number = 250; // Pixels per second
  radius: number = 15;
  hp: number = 100;
  maxHp: number = 100;
  damage: number = 10;
  game: Game;
  
  multiShotLevel: number = 0;
  magnetRadius: number = 100;

  // New Stats
  pierceCount: number = 0;
  explosionRadius: number = 0;
  homingStrength: number = 0; // 0 to 1
  projectileSpeedMult: number = 1.0;
  projectileRangeMult: number = 1.0;
  projectileSizeMult: number = 1.0; // Multiplier for projectile size
  critChance: number = 0; // 0 to 1
  vampireHeal: number = 0; // HP per 50 kills
  damageReduction: number = 0; // 0 to 1
  deepPressure: boolean = false;
  scavengerChance: number = 0; // Starts at 0, only works with upgrade ranks
  xpMultiplier: number = 1.0; // XP gain multiplier
  
  // Newest Stats
  scatterLevel: number = 0;
  rearGunsLevel: number = 0;
  knockbackStrength: number = 0;
  freezeChance: number = 0;
  giantTorpedoLevel: number = 0;
  shotsFired: number = 0;
  
  // Ability Levels
  plasmaFieldLevel: number = 0;
  depthChargeLevel: number = 0;
  sonarPulseLevel: number = 0;

  // Timers
  shootCooldown: number = 0;
  attackInterval: number = 0.5;
  
  depthChargeTimer: number = 0;
  plasmaTimer: number = 0; // For damage tick
  plasmaPulseTimer: number = 0; // For visual pulse when dealing damage
  sonarPulseTimer: number = 0; // Timer for sonar pulse
  damageFlashTimer: number = 0; // Flash HP bar when taking damage
  propellerRotation: number = 0; // Propeller rotation angle

  vampireCounter: number = 0; // Track kills for vampire
  
  // Spawn bobbing animation
  spawnBobTimer: number = 0;
  spawnTargetY: number = 0;
  spawnBobComplete: boolean = false;
  
  // Bubble trail
  bubbles: Array<{x: number, y: number, size: number, alpha: number, life: number, maxLife: number}> = [];
  bubbleSpawnTimer: number = 0;
  
  // Debug
  isInvulnerable: boolean = false;

  constructor(game: Game, x: number, y: number) {
    this.game = game;
    this.spawnTargetY = y;
    this.position = new Vector2(x, y);
    this.velocity = new Vector2(0, 0);
    this.spawnBobTimer = 0;
    this.spawnBobComplete = false;
  }

  update(dt: number) {
    // Handle spawn bobbing animation (0.5 seconds)
    if (!this.spawnBobComplete) {
      this.spawnBobTimer += dt;
      if (this.spawnBobTimer < 0.5) {
        // Bob down and up using a sine wave
        // Start at spawnTargetY, go down 10px, then back up to spawnTargetY
        const progress = this.spawnBobTimer / 0.5; // 0 to 1
        const bobAmount = Math.sin(progress * Math.PI) * 10; // +10px down, then back to 0
        this.position.y = this.spawnTargetY + bobAmount;
      } else {
        // Animation complete, ensure position is correct and mark as complete
        this.position.y = this.spawnTargetY;
        this.spawnBobComplete = true;
      }
    }
    
    const input = this.game.input;
    const moveDir = new Vector2(0, 0);

    if (input.keys['w'] || input.keys['ArrowUp']) moveDir.y -= 1;
    if (input.keys['s'] || input.keys['ArrowDown']) moveDir.y += 1;
    if (input.keys['a'] || input.keys['ArrowLeft']) moveDir.x -= 1;
    if (input.keys['d'] || input.keys['ArrowRight']) moveDir.x += 1;

    const normalizedDir = moveDir.normalize();
    this.position.x += normalizedDir.x * this.speed * dt;
    // Only apply Y movement if spawn animation is complete
    if (this.spawnBobComplete) {
      this.position.y += normalizedDir.y * this.speed * dt;
    }

    // Shooting Logic
    this.shootCooldown -= dt;
    if (this.shootCooldown <= 0) {
        this.shootAtMouse();
        this.shootCooldown = this.attackInterval;
    }
    
     // Ability Timers
     this.updateAbilities(dt);
     
     // Update damage flash timer for HP bar
     if (this.damageFlashTimer > 0) {
         this.damageFlashTimer -= dt;
     }
     
     // Update propeller rotation (spin continuously)
     this.propellerRotation += dt * 8; // Rotate 8 radians per second (moderate spin)
     if (this.propellerRotation > Math.PI * 2) {
         this.propellerRotation -= Math.PI * 2;
     }
     
     // Update bubble trail
     this.bubbleSpawnTimer += dt;
     if (this.bubbleSpawnTimer >= 0.05) { // Spawn bubble every 0.05 seconds
         this.bubbleSpawnTimer = 0;
         // Calculate angle submarine is facing (towards mouse)
         const mouseScreen = this.game.mousePosition;
         const worldMouseX = mouseScreen.x + this.game.camera.x;
         const worldMouseY = mouseScreen.y + this.game.camera.y;
         const dx = worldMouseX - this.position.x;
         const dy = worldMouseY - this.position.y;
         const angle = Math.atan2(dy, dx);
         
         // Spawn bubble from back of submarine (propeller area) - further back
         const backOffsetX = Math.cos(angle + Math.PI) * 20; // Further back (was 15)
         const backOffsetY = Math.sin(angle + Math.PI) * 20; // Further back (was 15)
         this.bubbles.push({
             x: this.position.x + backOffsetX + (Math.random() - 0.5) * 6, // Less spread
             y: this.position.y + backOffsetY + (Math.random() - 0.5) * 6, // Less spread
             size: 2 + Math.random() * 3, // 2-5 pixels
             alpha: 0.8,
             life: 0.4 + Math.random() * 0.3, // 0.4-0.7 seconds
             maxLife: 0.4 + Math.random() * 0.3
         });
     }
     
     // Update existing bubbles
     for (let i = this.bubbles.length - 1; i >= 0; i--) {
         const bubble = this.bubbles[i];
         bubble.life -= dt;
         bubble.alpha = (bubble.life / bubble.maxLife) * 0.8; // Fade out
         bubble.y -= dt * 30; // Float upward
         bubble.x += (Math.random() - 0.5) * dt * 10; // Slight horizontal drift
         
         if (bubble.life <= 0) {
             this.bubbles.splice(i, 1);
         }
     }
   }
  
  updateAbilities(dt: number) {
      // Depth Charge (Every 3s)
      if (this.depthChargeLevel > 0) {
          this.depthChargeTimer -= dt;
          if (this.depthChargeTimer <= 0) {
              this.spawnDepthCharge();
              this.depthChargeTimer = 3.0; // Every 3 seconds
          }
      }
      
      // Sonar Pulse (Every 7s)
      if (this.sonarPulseLevel > 0) {
          this.sonarPulseTimer -= dt;
          if (this.sonarPulseTimer <= 0) {
              this.triggerSonarPulse();
              this.sonarPulseTimer = 7.0; // Every 7 seconds
          }
      }
      
      // Plasma Field (Continuous, tick every 0.5s)
      if (this.plasmaFieldLevel > 0) {
          this.plasmaTimer -= dt;
          if (this.plasmaTimer <= 0) {
              this.triggerPlasmaTick();
              this.plasmaTimer = 0.5;
          }
          
          // Update pulse timer
          if (this.plasmaPulseTimer > 0) {
              this.plasmaPulseTimer -= dt;
          }
      }
  }
  
  spawnDepthCharge() {
      // Safety check: prevent infinite recursion
      // The Game class should override this method, but if it hasn't been overridden yet,
      // we'll spawn directly here as a fallback instead of calling recursively
      if (this.game && this.game.depthCharges) {
          this.game.depthCharges.push(new DepthCharge(this.game, this.position.x, this.position.y));
      }
  }
  
  triggerPlasmaTick() {
      // AoE around player
      const radius = 50 + (this.plasmaFieldLevel * 10);
      const damage = 5 * this.plasmaFieldLevel;
      
      let didDamage = false;
      
      // Damage enemies
      this.game.enemies.forEach(e => {
          if (this.position.distanceTo(e.position) < radius + e.radius) {
              e.takeDamage(damage);
              didDamage = true;
          }
      });
      
      // Damage Kraken during boss fight
      if (this.game.isBossFight && this.game.kraken) {
          if (this.position.distanceTo(this.game.kraken.position) < radius + this.game.kraken.radius) {
              this.game.kraken.takeDamage(damage);
              didDamage = true;
          }
      }
      
      // Trigger pulse visual effect if damage was dealt
      if (didDamage) {
          this.plasmaPulseTimer = 0.15; // Pulse duration
      }
  }
  
  triggerSonarPulse() {
      // Create expanding pulse that damages enemies when it reaches them
      // Base damage increases with level, but decreases with distance
      // Damage increased by 45%: [0, 3, 5, 7, 15, 20, 30, 40] -> [0, 4.35, 7.25, 10.15, 21.75, 29, 43.5, 58]
      const damageByRank = [0, 4.35, 7.25, 10.15, 21.75, 29, 43.5, 58]; // Rank 0 is unused, ranks 1-5 (maxRank reduced to 5)
      const baseDamage = damageByRank[this.sonarPulseLevel] || 4.35; // Default to 4.35 if level is out of range
      const maxRadius = Math.max(this.game.canvas.width, this.game.canvas.height) * 1.5; // Cover entire screen
      
      // Visual effect - create expanding pulse animation
      // Damage will be calculated as the pulse expands in the update loop
      this.game.createSonarPulseVisual(this.position, maxRadius, baseDamage, this.sonarPulseLevel);
  }

  shootAtMouse() {
      // Get mouse position in world coordinates
      const mouseScreen = this.game.mousePosition;
      const worldMouseX = mouseScreen.x + this.game.camera.x;
      const worldMouseY = mouseScreen.y + this.game.camera.y;
      const worldMouse = new Vector2(worldMouseX, worldMouseY);

      const dir = worldMouse.sub(this.position).normalize();
      const speed = 400 * this.projectileSpeedMult;
      
      // Increment shots fired
      this.shotsFired++;
      
      // Check for Giant Shot
      let isGiantShot = false;
      if (this.giantTorpedoLevel > 0 && this.shotsFired % 10 === 0) {
          isGiantShot = true;
      }

      // Calculate total number of projectiles to adjust sound volume slightly
      let totalProjectiles = 1; // Base shot
      if (this.rearGunsLevel > 0) totalProjectiles += 1; // Rear guns
      if (this.multiShotLevel > 0) totalProjectiles += this.multiShotLevel * 2; // Multi-shot (2 per level)
      
      // Play sound once - slightly louder with more projectiles (but capped)
      const baseVolume = 0.3;
      const adjustedVolume = Math.min(0.4, baseVolume + (totalProjectiles - 1) * 0.02); // Slight increase, max 0.4
      this.game.soundManager.playShoot(adjustedVolume);

      // Base shot
      this.fireProjectile(dir, speed, isGiantShot);
      
      // Rear Guns
      if (this.rearGunsLevel > 0) {
          const rearDir = dir.scale(-1);
          this.fireProjectile(rearDir, speed);
      }

      // Multi-shot
      if (this.multiShotLevel > 0) {
         for (let i = 1; i <= this.multiShotLevel; i++) {
             const angle = (Math.PI / 12) * i;
             
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

  fireProjectile(dir: Vector2, speed: number, isGiant: boolean = false) {
      const velocity = dir.scale(speed);
      // Spawn from front of player (approximate based on radius)
      const spawnOffset = dir.scale(this.radius * 1.5);
      const spawnPos = this.position.add(spawnOffset);
      
      const projectile = new Projectile(this.game, spawnPos.x, spawnPos.y, velocity);
      
      // Apply stats
      let finalDamage = this.damage;
      
      // Deep Pressure Logic
      // 0% bonus at 0 meters, 50% bonus at 1000 meters (or in Kraken arena)
      if (this.deepPressure) {
          let depthBonus = 0;
          if (this.game.isBossFight) {
              // In Kraken arena, treat as max depth (1000m = 50% bonus)
              depthBonus = 0.5;
          } else {
              // Linear scaling: 0% at 0m, 50% at 1000m
              const depthMeters = this.game.depth;
              depthBonus = Math.min(0.5, depthMeters / 1000 * 0.5);
          }
          finalDamage *= (1 + depthBonus);
      }
      
      // Critical Hit
      if (Math.random() < this.critChance) {
          finalDamage *= 2;
          projectile.isCritical = true;
      }
      
      projectile.damage = finalDamage;
      projectile.pierce = this.pierceCount;
      projectile.explosionRadius = this.explosionRadius;
      projectile.isHoming = this.homingStrength > 0;
      projectile.duration *= this.projectileRangeMult;
      
      // New Props
      projectile.knockbackForce = this.knockbackStrength;
      if (Math.random() < this.freezeChance) {
          projectile.freezeDuration = 3.0; // 3s freeze
      }
      if (this.scatterLevel > 0) {
          projectile.scatterOnHit = true;
      }
      
      if (isGiant) {
          projectile.isGiant = true;
          projectile.damage *= 5; // Massive damage
          projectile.pierce += 100; // Pierce everything
          projectile.radius *= 1.75; // Giant torpedoes are 5x bigger
          projectile.knockbackForce += 500; // Massive push
          projectile.explosionRadius += 100;
          
          // Screen shake when giant torpedo is fired
          this.game.addScreenShake(15); // Same amount as current explosion shake
      } else {
          // Apply projectile size multiplier (but not to giant torpedoes, they have their own scaling)
          projectile.radius *= this.projectileSizeMult;
      }
      
      this.game.projectiles.push(projectile);
      // Sound is now played once in shootAtMouse() to prevent volume stacking
  }
  


  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    
    // Draw Plasma Field
    if (this.plasmaFieldLevel > 0) {
        const baseRadius = 50 + (this.plasmaFieldLevel * 10);
        
        // Apply subtle pulse when dealing damage
        let radius = baseRadius;
        let pulseAlpha = 0.1;
        let strokeAlpha = 0.3;
        
        if (this.plasmaPulseTimer > 0) {
            // Pulse effect: slightly expand and brighten
            const pulseProgress = 1 - (this.plasmaPulseTimer / 0.15); // 0 to 1 as pulse fades
            const pulseAmount = Math.sin(pulseProgress * Math.PI); // Smooth pulse curve
            radius = baseRadius * (1 + pulseAmount * 0.08); // Expand up to 8%
            pulseAlpha = 0.1 + (pulseAmount * 0.08); // Brighten slightly
            strokeAlpha = 0.3 + (pulseAmount * 0.2); // Brighten stroke more
        }
        
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 255, ${pulseAlpha})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(0, 255, 255, ${strokeAlpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    // Calculate angle to mouse
    const mouseScreen = this.game.mousePosition;
    const worldMouseX = mouseScreen.x + this.game.camera.x;
    const worldMouseY = mouseScreen.y + this.game.camera.y;
    
    const dx = worldMouseX - this.position.x;
    const dy = worldMouseY - this.position.y;
    const angle = Math.atan2(dy, dx);
    
    // Rotate context to face mouse
    ctx.rotate(angle);

    // Draw centered, scaled up by 2
    const scale = 2;
    
    // Fix upside down rendering when facing left
    const isFlipped = Math.abs(angle) > Math.PI / 2;
    if (isFlipped) {
        ctx.scale(1, -1);
    }

    // Draw spinning propeller first (behind everything)
    ctx.save();
    const spriteWidth = 20 * scale;
    const spriteHeight = 12 * scale;
    const propX = (-spriteWidth / 2 + 1.5 * scale);
    const propY = (-spriteHeight / 2 + 6 * scale);
    
    ctx.translate(propX, propY);
    ctx.rotate(this.propellerRotation);
    
    const bladeLength = 3 * scale * 0.75; // 25% smaller propeller
    
    // Draw 4 blades in an X pattern with dark gray outline
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 2.5 * scale;
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(bladeLength * 0.7, -bladeLength * 0.7);
    ctx.moveTo(0, 0);
    ctx.lineTo(bladeLength * 0.7, bladeLength * 0.7);
    ctx.moveTo(0, 0);
    ctx.lineTo(-bladeLength * 0.7, -bladeLength * 0.7);
    ctx.moveTo(0, 0);
    ctx.lineTo(-bladeLength * 0.7, bladeLength * 0.7);
    ctx.stroke();
    
    // Draw blades again in darker gray color
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1.2 * scale;
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(bladeLength * 0.7, -bladeLength * 0.7);
    ctx.moveTo(0, 0);
    ctx.lineTo(bladeLength * 0.7, bladeLength * 0.7);
    ctx.moveTo(0, 0);
    ctx.lineTo(-bladeLength * 0.7, -bladeLength * 0.7);
    ctx.moveTo(0, 0);
    ctx.lineTo(-bladeLength * 0.7, bladeLength * 0.7);
    ctx.stroke();
    
    ctx.restore(); // Restore propeller transform

    // Draw bubbles (on top of propeller, but behind sub body)
    // Convert bubble world positions to local transformed coordinates
    for (const bubble of this.bubbles) {
        // Transform bubble world position to local coordinates
        const localX = bubble.x - this.position.x;
        const localY = bubble.y - this.position.y;
        
        // Rotate to match submarine rotation
        const cos = Math.cos(-angle);
        const sin = Math.sin(-angle);
        const rotatedX = localX * cos - localY * sin;
        const rotatedY = localX * sin + localY * cos;
        
        // Apply flip if needed
        const finalY = isFlipped ? -rotatedY : rotatedY;
        
        ctx.save();
        ctx.globalAlpha = bubble.alpha;
        ctx.fillStyle = '#87CEEB';
        ctx.strokeStyle = '#4682B4';
        ctx.lineWidth = 0.5;
        
        ctx.beginPath();
        ctx.arc(rotatedX, finalY, bubble.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    // Draw player submarine body (on top of bubbles and propeller)
    // spriteWidth and spriteHeight already defined above
    
    // Main body (yellow submarine hull)
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 1;
    
    // Main hull body (rectangular with beveled edges and rounded front)
    const hullX = -spriteWidth / 2 + 2 * scale; // Start after propeller area
    const hullY = -spriteHeight / 2 + 3 * scale;
    const hullWidth = 14 * scale;
    const hullHeight = 5 * scale;
    const cornerRadius = 1 * scale; // Beveled corner radius
    const frontRadius = 2.5 * scale; // Rounded front (right side)
    
    // Draw hull with beveled corners and rounded front
    ctx.beginPath();
    // Start from left side (back), top
    ctx.moveTo(hullX + cornerRadius, hullY);
    // Top edge with rounded front
    ctx.lineTo(hullX + hullWidth - frontRadius, hullY);
    // Rounded front (right side)
    ctx.arc(hullX + hullWidth - frontRadius, hullY + hullHeight / 2, frontRadius, -Math.PI / 2, Math.PI / 2, false);
    // Bottom edge
    ctx.lineTo(hullX + cornerRadius, hullY + hullHeight);
    // Bottom-left corner
    ctx.arc(hullX + cornerRadius, hullY + hullHeight - cornerRadius, cornerRadius, Math.PI / 2, Math.PI, false);
    // Left edge
    ctx.lineTo(hullX, hullY + cornerRadius);
    // Top-left corner
    ctx.arc(hullX + cornerRadius, hullY + cornerRadius, cornerRadius, Math.PI, -Math.PI / 2, false);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Dark yellow border/shadow details
    ctx.fillStyle = '#B8860B';
    ctx.fillRect(hullX + 6 * scale, hullY + 1 * scale, 3 * scale, 1);
    ctx.fillRect(hullX + 6 * scale, hullY + 4 * scale, 3 * scale, 1);
    
    // Orange decoration
    ctx.fillStyle = '#FFA500';
    ctx.fillRect(hullX + 7 * scale, hullY + 2 * scale, 1 * scale, 1 * scale);
    
    // Conning tower (light yellow with blue window) - rounded/beveled
    const towerX = -spriteWidth / 2 + 6 * scale; // Adjusted to center larger tower
    const towerY = -spriteHeight / 2 + 0.5 * scale; // Higher position
    const towerWidth = 4.2 * scale; // Increased from 3.5
    const towerHeight = 3 * scale; // Increased from 2.4
    const towerCornerRadius = 1.1 * scale; // Larger corner radius
    
    // Tower base with rounded corners
    ctx.fillStyle = '#FFED4E';
    ctx.strokeStyle = '#B8860B';
    ctx.beginPath();
    ctx.moveTo(towerX + towerCornerRadius, towerY);
    ctx.lineTo(towerX + towerWidth - towerCornerRadius, towerY);
    ctx.arc(towerX + towerWidth - towerCornerRadius, towerY + towerCornerRadius, towerCornerRadius, -Math.PI / 2, 0, false);
    ctx.lineTo(towerX + towerWidth, towerY + towerHeight - towerCornerRadius);
    ctx.arc(towerX + towerWidth - towerCornerRadius, towerY + towerHeight - towerCornerRadius, towerCornerRadius, 0, Math.PI / 2, false);
    ctx.lineTo(towerX + towerCornerRadius, towerY + towerHeight);
    ctx.arc(towerX + towerCornerRadius, towerY + towerHeight - towerCornerRadius, towerCornerRadius, Math.PI / 2, Math.PI, false);
    ctx.lineTo(towerX, towerY + towerCornerRadius);
    ctx.arc(towerX + towerCornerRadius, towerY + towerCornerRadius, towerCornerRadius, Math.PI, -Math.PI / 2, false);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Blue window (beveled port hole - perfectly circular and rounded)
    const windowX = towerX + towerWidth / 2;
    const windowY = towerY + towerHeight / 2;
    const windowRadius = 1.1 * scale; // Perfect circle - same radius for both axes
    const borderThickness = 0.25 * scale; // Border thickness
    
    // Outer bevel (darker border) - perfectly circular
    ctx.fillStyle = '#B8860B';
    ctx.beginPath();
    ctx.arc(windowX, windowY, windowRadius + borderThickness, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner window (blue) - perfectly circular
    ctx.fillStyle = '#87CEEB';
    ctx.beginPath();
    ctx.arc(windowX, windowY, windowRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner highlight (lighter blue for bevel effect) - perfectly circular
    ctx.fillStyle = '#B0E0E6';
    ctx.beginPath();
    ctx.arc(windowX - 0.2 * scale, windowY - 0.2 * scale, windowRadius * 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  takeDamage(amount: number) {
    // Debug invulnerability
    if (this.isInvulnerable) return;
    
    // Apply Damage Reduction
    const reducedAmount = amount * (1 - this.damageReduction);
    this.hp -= reducedAmount;
    
    // Trigger damage flash
    this.damageFlashTimer = 0.3; // Flash for 0.3 seconds
    
    // Play damage sound
    this.game.soundManager.playPlayerDamage();
    
    if (this.hp <= 0) {
        this.hp = 0;
        this.game.gameOver();
    }
  }
  
  onEnemyKilled() {
      if (this.vampireHeal > 0) {
          this.vampireCounter++;
          if (this.vampireCounter >= 50) {
              this.vampireCounter = 0;
              this.hp = Math.min(this.hp + this.vampireHeal, this.maxHp);
          }
      }
  }
}
