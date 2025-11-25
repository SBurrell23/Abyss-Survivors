import { Vector2 } from '../utils';
import { Game } from '../Game';
import { Projectile } from './Projectile';
import { SpriteFactory } from '../graphics/SpriteFactory';

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

  vampireCounter: number = 0; // Track kills for vampire
  
  // Debug
  isInvulnerable: boolean = false;

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
        this.shootAtMouse();
        this.shootCooldown = this.attackInterval;
    }
    
     // Ability Timers
     this.updateAbilities(dt);
     
     // Update damage flash timer for HP bar
     if (this.damageFlashTimer > 0) {
         this.damageFlashTimer -= dt;
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
      // Placeholder: Spawn depth charge entity
      this.game.player.spawnDepthCharge(); // Hook
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
      const baseDamage = 3 + (this.sonarPulseLevel * 2); // 3-19 damage at max level (8 ranks)
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

    const sprite = SpriteFactory.getSprite('player');
    // Draw centered, scaled up by 2
    const scale = 2;
    
    // Fix upside down rendering when facing left
    if (Math.abs(angle) > Math.PI / 2) {
        ctx.scale(1, -1);
    }

    ctx.drawImage(sprite, -sprite.width * scale / 2, -sprite.height * scale / 2, sprite.width * scale, sprite.height * scale);

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
              this.hp = Math.min(this.hp + 1, this.maxHp);
          }
      }
  }
}
