import { Player } from './entities/Player';
import { Enemy, MonsterStats } from './entities/Enemy';
import { OrbitProjectile } from './entities/OrbitProjectile';
import { Projectile } from './entities/Projectile';
import { XPOrb } from './entities/XPOrb';
import { DepthCharge } from './entities/NewEntities';
import { Explosion } from './entities/Explosion';
import { TreasureChest } from './entities/TreasureChest';
import { Kraken } from './entities/Kraken';
import { Vector2 } from './utils';
import { UpgradeManager } from './UpgradeManager';
import monstersData from './data/monsters.json';
import { SpriteFactory } from './graphics/SpriteFactory';

interface Particle {
    x: number; 
    y: number;
    size: number;
    vx: number; 
    vy: number;
    alpha: number;
    color: string;
}

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  lastTime: number = 0;
  player: Player;
  input: { keys: Record<string, boolean> } = { keys: {} };
  
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  xpOrbs: XPOrb[] = [];
  
  // New Entities Lists
  depthCharges: DepthCharge[] = [];
  explosions: Explosion[] = [];
  treasureChests: TreasureChest[] = [];
  kraken: Kraken | null = null;
  
  upgradeManager: UpgradeManager;
  
  // Game State
  isMinigameActive: boolean = false;
  minigameCursor: number = 0; // 0 to 1
  minigameDirection: number = 1; 
  minigameShowingReward: boolean = false;
  
  // Map Logic
  trenchX: number | null = null;
  isBossFight: boolean = false;
  bossFightTimer: number = 0;
  
  score: number = 0;
  depth: number = 0; 
  upgradeLevel: number = 1; 
  xp: number = 0;
  xpToNextLevel: number = 100;
  isPaused: boolean = false;
  isGameOver: boolean = false;
  
  mousePosition: Vector2 = new Vector2(0, 0);

  // Camera
  camera: Vector2 = new Vector2(0, 0);
  
  // Debug
  xpMultiplier: number = 1;

  // Stateless Tiled Particle System
  particleTileSize: number = 1024;
  particleDefs: Particle[] = [];
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false; 
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.setupInput();
    
    // Minigame input
    window.addEventListener('keydown', (e) => {
        if (this.isMinigameActive && e.code === 'Space') {
            this.stopMinigame();
        }
    });

    this.setupRestart();
    this.initParticleDefs();

    this.player = new Player(this, 0, 0);
    this.upgradeManager = new UpgradeManager(this);
    
    // Override Player spawn methods to hook into Game
    this.player.spawnDepthCharge = () => {
        this.depthCharges.push(new DepthCharge(this, this.player.position.x, this.player.position.y));
    };
  }
  
  createExplosion(pos: Vector2, radius: number, damage: number) {
      // Simple visual or damage if damage > 0
      if (damage > 0) {
          this.enemies.forEach(e => {
             if (pos.distanceTo(e.position) < radius + e.radius) {
                 e.takeDamage(damage);
             }
          });
      }
      
      this.explosions.push(new Explosion(this, pos.x, pos.y, radius));
  }
  
  initParticleDefs() {
      for (let i = 0; i < 100; i++) {
          this.particleDefs.push({
              x: Math.random() * this.particleTileSize,
              y: Math.random() * this.particleTileSize,
              size: Math.random() * 3 + 1,
              vx: (Math.random() - 0.5) * 10,
              vy: -(Math.random() * 20 + 5),
              alpha: Math.random() * 0.3 + 0.1,
              color: Math.random() > 0.5 ? '255, 255, 255' : '100, 255, 255'
          });
      }
  }

  drawParticles(ctx: CanvasRenderingContext2D) {
      const startTx = Math.floor(this.camera.x / this.particleTileSize);
      const endTx = Math.floor((this.camera.x + this.canvas.width) / this.particleTileSize);
      const startTy = Math.floor(this.camera.y / this.particleTileSize);
      const endTy = Math.floor((this.camera.y + this.canvas.height) / this.particleTileSize);
      
      const time = performance.now() / 1000;

      for (let tx = startTx; tx <= endTx; tx++) {
          for (let ty = startTy; ty <= endTy; ty++) {
              const tileOriginX = tx * this.particleTileSize;
              const tileOriginY = ty * this.particleTileSize;
              
              for (const p of this.particleDefs) {
                  const driftX = (p.vx * time) % this.particleTileSize;
                  const driftY = (p.vy * time) % this.particleTileSize;
                  
                  let px = (p.x + driftX);
                  let py = (p.y + driftY);
                  
                  if (px < 0) px += this.particleTileSize;
                  if (px > this.particleTileSize) px -= this.particleTileSize;
                  if (py < 0) py += this.particleTileSize;
                  if (py > this.particleTileSize) py -= this.particleTileSize;
                  
                  const worldX = tileOriginX + px;
                  const worldY = tileOriginY + py;
                  
                  ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
                  ctx.fillRect(worldX, worldY, p.size, p.size);
              }
          }
      }
  }
  
  drawSeaFloor(ctx: CanvasRenderingContext2D) {
      const MAX_DEPTH_METERS = 1000;
      const PIXELS_PER_METER = 25;
      const floorY = MAX_DEPTH_METERS * PIXELS_PER_METER;

      // Check if visible (with buffer)
      if (floorY > this.camera.y + this.canvas.height + 100) return;

      const floorColor = '#3e2723'; // Dark brown
      const sandColor = '#5d4037'; // Slightly lighter
      
      // Draw deep earth
      ctx.fillStyle = '#1a100e'; 
      ctx.fillRect(this.camera.x, floorY + 50, this.canvas.width, 2000); 

      // Trench Graphic
      if (this.trenchX !== null) {
           const trenchWidth = 500;
           const trenchLeft = this.trenchX - trenchWidth/2;
           
           // Draw a dark hole
           ctx.fillStyle = '#000010'; // Almost black blue
           ctx.fillRect(trenchLeft, floorY, trenchWidth, 2000);
      }

      // Draw Sand Layer (base)
      ctx.fillStyle = floorColor;
      ctx.fillRect(this.camera.x, floorY, this.canvas.width, 50);

      // Procedural details
      // Iterate across the screen width in steps
      const step = 40;
      // Align startX to grid to prevent jitter when moving
      const startX = Math.floor(this.camera.x / step) * step;
      const endX = startX + this.canvas.width + step;

      for (let x = startX; x <= endX; x += step) {
          // Pseudo-random based on x coordinate
          // Using a simple seeded random concept: sin(x) is deterministic
          const noise = Math.sin(x * 0.05) + Math.sin(x * 0.13) * 0.5;
          
          // Variation in floor height
          const height = 10 + noise * 5;
          
          // Draw uneven sand top
          ctx.fillStyle = sandColor;
          ctx.fillRect(x, floorY - height, step + 1, 50 + height);

          // Occasional Rock/Debris
          // Use a different frequency for rocks
          if (Math.abs(Math.sin(x * 0.987)) > 0.8) {
               ctx.fillStyle = '#251612'; // Rock color
               const rockSize = 15 + Math.sin(x) * 5;
               ctx.beginPath();
               ctx.arc(x + step/2, floorY - height, rockSize, 0, Math.PI, true);
               ctx.fill();
          }
          
          // Seaweed-like strands
          if (Math.abs(Math.cos(x * 0.456)) > 0.9) {
              ctx.strokeStyle = '#2e7d32'; // Dark green
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(x + step/2, floorY - height);
              // Swaying effect using time
              const sway = Math.sin(performance.now() / 500 + x) * 10;
              ctx.quadraticCurveTo(
                  x + step/2 + sway, floorY - height - 20, 
                  x + step/2 + sway * 1.5, floorY - height - 40
              );
              ctx.stroke();
          }
      }
  }
  
  setupRestart() {
      const restartBtn = document.getElementById('restart-btn');
      if (restartBtn) {
          restartBtn.onclick = () => {
             location.reload();
          };
      }
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx.imageSmoothingEnabled = false; 
  }

  setupInput() {
    window.addEventListener('keydown', (e) => {
      this.input.keys[e.key] = true;
      
      // Debug: Ctrl + P to toggle 25x speed and 100x XP
      if (e.ctrlKey && e.code === 'KeyP') {
          e.preventDefault(); 
          if (this.player.speed === 200) {
              this.player.speed = 5000; 
              this.xpMultiplier = 100;
              console.log("Debug: Speed set to 5000 (25x), XP x100");
          } else {
              this.player.speed = 200; 
              this.xpMultiplier = 1;
              console.log("Debug: Speed reset to 200, XP x1");
          }
      }
    });
    window.addEventListener('keyup', (e) => {
      this.input.keys[e.key] = false;
    });
    
    window.addEventListener('mousemove', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        this.mousePosition.x = e.clientX - rect.left;
        this.mousePosition.y = e.clientY - rect.top;
    });
  }

  start() {
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  loop(timestamp: number) {
    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    if (!this.isPaused && !this.isGameOver) {
      this.update(dt);
    }
    this.draw();

    requestAnimationFrame(this.loop.bind(this));
  }

  update(dt: number) {
    // Minigame Logic
    if (this.isMinigameActive) {
        if (this.minigameShowingReward) return; // Pause everything

        this.minigameCursor += this.minigameDirection * dt * 1.5; // Speed Reduced
        if (this.minigameCursor >= 1) {
            this.minigameCursor = 1;
            this.minigameDirection = -1;
        } else if (this.minigameCursor <= 0) {
            this.minigameCursor = 0;
            this.minigameDirection = 1;
        }
        
        const cursorEl = document.getElementById('gauge-cursor');
        if (cursorEl) cursorEl.style.left = `${this.minigameCursor * 100}%`;
        return; // Pause other updates
    }
    
    if (this.isBossFight && this.kraken) {
        this.kraken.update(dt);
        this.player.update(dt);
        
        // Keep player in bounds for boss fight
        // ...
        
        // Update Projectiles
        this.projectiles.forEach(p => p.update(dt));
        this.projectiles = this.projectiles.filter(p => p.active);
        
        // Collisions
        this.checkCollisions();
        this.updateUI();
        
        // Boss Fight Timer
        this.bossFightTimer += dt;
        
        return;
    }

    // Sea Floor Logic
    const MAX_DEPTH_METERS = 1000;
    const PIXELS_PER_METER = 25;
    const MAX_DEPTH_PIXELS = MAX_DEPTH_METERS * PIXELS_PER_METER;

    // Clamp player Y to sea floor
    if (this.player.position.y > MAX_DEPTH_PIXELS) {
        this.player.position.y = MAX_DEPTH_PIXELS;
    }
    // Clamp player Y to surface
    if (this.player.position.y < 30) {
        this.player.position.y = 30;
    }

    // Calculate depth
    this.depth = Math.max(0, Math.floor(this.player.position.y / PIXELS_PER_METER));
    
    // Trench Logic
    if (this.depth >= 950 && this.trenchX === null) {
        // Spawn trench nearby
        const direction = Math.random() > 0.5 ? 1 : -1;
        this.trenchX = this.player.position.x + direction * 250 * PIXELS_PER_METER / 25; // 250m converted? 
        // Wait, 250m is distance. PIXELS_PER_METER = 25.
        // 250m * 25 = 6250 pixels.
        this.trenchX = this.player.position.x + direction * 6250;
    }
    
    // Check for trench entry
    if (this.trenchX !== null) {
        const dist = Math.abs(this.player.position.x - this.trenchX);
        // Trench is approx 500px wide
        if (dist < 250 && this.depth >= 980) {
            this.enterBossFight();
        }
    }

    this.player.update(dt);
    // Particles are now stateless/time-based, no update needed

    // Update camera to follow player
    // Default behavior: center on player
    let targetCamY = this.player.position.y - this.canvas.height / 2;
    
    // Clamp camera top: Prevent showing too much sky (allow only 15%)
    // Surface is at y=0.
    // If we want y=0 to be at 15% down the screen (0.15 * height):
    // screenY = worldY - camY
    // 0.15 * H = 0 - camY  => camY = -0.15 * H
    const minCamY = -0.15 * this.canvas.height;
    if (targetCamY < minCamY) {
        targetCamY = minCamY;
    }
    
    this.camera.x = this.player.position.x - this.canvas.width / 2;
    this.camera.y = targetCamY;

    // Update enemies
    this.enemies.forEach(e => e.update(dt));
    this.enemies = this.enemies.filter(e => e.active);

    // Update projectiles
    this.projectiles.forEach(p => p.update(dt));
    this.projectiles = this.projectiles.filter(p => p.active);
    
    // Update Depth Charges
    this.depthCharges.forEach(d => d.update(dt));
    this.depthCharges = this.depthCharges.filter(d => d.active);

    // Update Explosions
    this.explosions.forEach(e => e.update(dt));
    this.explosions = this.explosions.filter(e => e.active);

    // Update XP Orbs
    this.xpOrbs.forEach(o => o.update(dt));
    this.xpOrbs = this.xpOrbs.filter(o => o.active);
    
    // Update Treasure Chests
    this.treasureChests.forEach(c => {
        // Simple logic if needed
        if (c) return; // keep compiler happy
    });
    
    // Spawn Treasure Chests
    if (Math.random() < 0.001) { // Rare spawn
        this.spawnTreasure();
    }

    // Spawner logic
    // Spawn rate increases with depth
    const spawnChance = 0.02 + (this.depth / 1000) * 0.13;
    
    if (Math.random() < spawnChance) { 
       this.spawnEnemy();
    }

    // Check Collisions
    this.checkCollisions();
    
    // Treasure Chest Collision
    for (const chest of this.treasureChests) {
        if (chest.active && chest.position.distanceTo(this.player.position) < chest.radius + this.player.radius) {
            chest.active = false;
            this.startMinigame();
        }
    }
    this.treasureChests = this.treasureChests.filter(c => c.active);

    // Update UI
    this.updateUI();
  }

  spawnEnemy() {
     // Spawn enemy just outside camera view
     const angle = Math.random() * Math.PI * 2;
     const dist = Math.max(this.canvas.width, this.canvas.height) / 2 + 50;
     const spawnPos = new Vector2(
        this.player.position.x + Math.cos(angle) * dist,
        this.player.position.y + Math.sin(angle) * dist
     );
     
     // Prevent spawning above surface
     if (spawnPos.y < 50) {
         // Try to push it down or just abort this spawn
         // Let's just reflect it down for simplicity
         spawnPos.y = Math.abs(spawnPos.y) + 100;
     }
     
     const monsters = monstersData as MonsterStats[];
     
     // Filter available monsters based on depth thresholds
     const available = monsters.filter(m => {
         if (m.id === 'fish_small') return true;
         if (m.id === 'fish_medium' && this.depth > 25) return true;
         if (m.id === 'crab' && this.depth > 50) return true;
         if (m.id === 'eel' && this.depth > 100) return true;
         if (m.id === 'angler' && this.depth > 150) return true;
         if (m.id === 'ray' && this.depth > 200) return true;
         if (m.id === 'turtle' && this.depth > 250) return true;
         if (m.id === 'squid' && this.depth > 350) return true;
         if (m.id === 'shark' && this.depth > 450) return true;
         if (m.id === 'abyss_horror' && this.depth > 800) return true;
         return false;
     });
     
     const pool = available.length > 0 ? available : [monsters[0]];

     // Calculate total weight with depth multipliers
     const weightedPool = pool.map(m => {
         let weight = (m as any).weight || 10;
         const isLarge = ['squid', 'shark', 'abyss_horror', 'turtle', 'angler'].includes(m.id);
         const isSmall = ['fish_small', 'fish_medium'].includes(m.id);

         // Aggressive weighting for deep depths
         if (this.depth > 500) {
             if (isLarge) weight *= 10; // Huge boost
             if (isSmall) weight *= 0.05; // Almost gone
         } else if (this.depth > 250) {
             if (isLarge) weight *= 3;
             if (isSmall) weight *= 0.5;
         }
         
         // Abyss Horror special boost near bottom
         if (m.id === 'abyss_horror' && this.depth > 900) {
             weight *= 20;
         }

         return { monster: m, weight };
     });

     const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);
     let rnd = Math.random() * totalWeight;
     
     let selectedMonster = weightedPool[0].monster;
     for (const item of weightedPool) {
         if (rnd < item.weight) {
             selectedMonster = item.monster;
             break;
         }
         rnd -= item.weight;
     }

     this.enemies.push(new Enemy(this, spawnPos.x, spawnPos.y, selectedMonster));
     
     // Scavenger Protocol Drop? (Only on kill, moved to checkCollisions or Enemy)
  }

  spawnTreasure() {
      // Spawn off-screen
      const side = Math.random() > 0.5 ? 1 : -1;
      const x = this.player.position.x + side * (this.canvas.width / 2 + 200 + Math.random() * 500);
      const y = this.player.position.y + (Math.random() - 0.5) * 600;
      
      this.treasureChests.push(new TreasureChest(this, x, y));
  }

  startMinigame() {
      this.isMinigameActive = true;
      this.minigameShowingReward = false;
      const layer = document.getElementById('minigame-layer');
      const rewardEl = document.getElementById('minigame-reward');
      if (layer) layer.style.display = 'flex';
      if (rewardEl) rewardEl.style.display = 'none';
      this.minigameCursor = 0;
  }
  
  stopMinigame() {
      if (this.minigameShowingReward) return;
      this.minigameShowingReward = true;
      
      // Calculate Reward
      let rarity = 'common';
      // Zones: Rare 42.5-57.5? No, CSS says: Rare width 15% at 42.5%, Legendary width 5% at 47.5%
      // Rare: 0.425 to 0.575
      // Legendary: 0.475 to 0.525 (Inside Rare)
      
      if (this.minigameCursor >= 0.425 && this.minigameCursor <= 0.575) rarity = 'rare';
      if (this.minigameCursor >= 0.475 && this.minigameCursor <= 0.525) rarity = 'legendary';
      
      const upgrades = this.upgradeManager.upgrades.filter(u => u.rarity === rarity);
      const pick = upgrades[Math.floor(Math.random() * upgrades.length)];
      
      if (pick) {
          this.upgradeManager.applyUpgrade(pick);
          
          // Show UI
          const rewardEl = document.getElementById('minigame-reward');
          const contentEl = document.getElementById('reward-content');
          if (rewardEl && contentEl) {
              rewardEl.style.display = 'block';
              contentEl.innerHTML = `
                  <div class="upgrade-icon" style="font-size: 48px;">${pick.icon}</div>
                  <h3 style="margin:0; color: ${rarity === 'legendary' ? '#ff9800' : rarity === 'rare' ? '#9c27b0' : '#4caf50'}">${pick.name}</h3>
                  <p style="margin:0; color:#ccc;">${pick.description}</p>
              `;
          }
      }
      
      setTimeout(() => {
          const layer = document.getElementById('minigame-layer');
          if (layer) layer.style.display = 'none';
          this.isMinigameActive = false;
          this.minigameShowingReward = false;
      }, 2000);
  }

  enterBossFight() {
      this.isBossFight = true;
      this.enemies = [];
      this.projectiles = [];
      this.depthCharges = [];
      
      // Teleport
      this.player.position.y += 2000; // Deep ocean
      this.kraken = new Kraken(this, this.player.position.x, this.player.position.y + 500);
      
      // UI Updates
      const depthMeter = document.getElementById('depth-meter-container');
      if (depthMeter) depthMeter.style.display = 'none';
  }
  
  winGame() {
      this.isGameOver = true;
      // Show Victory Screen
      const deathScreen = document.getElementById('death-screen');
      if (deathScreen) {
          deathScreen.style.display = 'flex';
          const h1 = deathScreen.querySelector('h1');
          if (h1) h1.innerText = "YOU CONQUERED THE ABYSS!";
          
          // Add stats
          const stats = document.createElement('div');
          stats.innerHTML = `
            <p>Time: ${Math.floor(this.lastTime / 1000)}s</p>
            <p>Boss Fight: ${Math.floor(this.bossFightTimer)}s</p>
          `;
          deathScreen.insertBefore(stats, document.getElementById('restart-btn'));
      }
  }

  checkCollisions() {
      if (this.isBossFight && this.kraken) {
          // Player Projectiles vs Kraken
          for (const proj of this.projectiles) {
              if (!proj.isEnemy && proj.position.distanceTo(this.kraken.position) < proj.radius + this.kraken.radius) {
                   this.kraken.takeDamage(proj.damage);
                   proj.onHit(this.kraken); // Might need to adjust onHit to accept Kraken
              }
              // Kraken Projectiles vs Player
              if (proj.isEnemy && proj.position.distanceTo(this.player.position) < proj.radius + this.player.radius) {
                  this.player.takeDamage(proj.damage);
                  proj.active = false;
              }
          }
          // Minions collision
          for (const enemy of this.enemies) {
             if (enemy.position.distanceTo(this.player.position) < (enemy.radius + this.player.radius)) {
                 this.player.takeDamage(10 * 0.016); 
             }
             // Projectiles vs Minions
             for (const proj of this.projectiles) {
                 if (!proj.isEnemy && proj.position.distanceTo(enemy.position) < proj.radius + enemy.radius) {
                     enemy.takeDamage(proj.damage);
                     proj.onHit(enemy);
                 }
             }
          }
          return;
      }

      // Player vs Enemies
      for (const enemy of this.enemies) {
          if (enemy.position.distanceTo(this.player.position) < (enemy.radius + this.player.radius)) {
              this.player.takeDamage(10 * 0.016); 
          }
      }
      
      // Depth Charges vs Enemies
      this.depthCharges.forEach(dc => {
          if (!dc.active) return;
          for (const enemy of this.enemies) {
              if (dc.position.distanceTo(enemy.position) < (dc.radius + enemy.radius)) {
                  dc.explode();
                  break;
              }
          }
      });

      // Projectiles vs Enemies
      for (const projectile of this.projectiles) {
          if (projectile instanceof OrbitProjectile) {
              if (projectile.isRecovering) continue;
              
              // AoE / Tick damage logic
              for (const enemy of this.enemies) {
                  if (projectile.position.distanceTo(enemy.position) < (projectile.radius + enemy.radius)) {
                      if (projectile.canHit(enemy)) {
                          enemy.takeDamage(projectile.damage);
                          this.onEnemyHit(enemy);
                      }
                  }
              }
              continue;
          }

          for (const enemy of this.enemies) {
              if (projectile.position.distanceTo(enemy.position) < (projectile.radius + enemy.radius)) {
                  // Check if projectile can hit (for piercing)
                  if (projectile.canHit(enemy)) {
                      enemy.takeDamage(projectile.damage);
                      projectile.onHit(enemy);
                      this.onEnemyHit(enemy);
                  }
                  // If not piercing or used up pierce, break handled in onHit logic if needed
                  // But standard loop continues unless broken. 
                  // If piercing, we want to continue checking other enemies?
                  // No, usually 1 projectile hits 1 thing per frame unless it's a huge railgun.
                  // But if it pierces, it should pass through.
                  // If we break here, we stop checking this projectile against other enemies THIS FRAME.
                  // That is correct for a small projectile.
                  break; 
              }
          }
      }

      // Player vs XP Orbs
      for (const orb of this.xpOrbs) {
          if (orb.position.distanceTo(this.player.position) < (orb.radius + this.player.radius)) {
              this.collectXP(orb.value);
              orb.active = false;
          }
      }
  }
  
  onEnemyHit(enemy: Enemy) {
      if (enemy.hp <= 0) {
          // Check scavenger protocol
          if (this.player.scavengerChance > 0 && Math.random() < this.player.scavengerChance) {
              // Drop Health Pack (Just instant heal for now?)
              // Or maybe spawn a heart pickup?
              // Instant heal for simplicity
              this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20);
              // Visual Text?
          }
          
          this.player.onEnemyKilled();
      }
  }

  collectXP(amount: number) {
      this.xp += amount * this.xpMultiplier;
      if (this.xp >= this.xpToNextLevel) {
          this.levelUp();
      }
  }

  levelUp() {
      this.upgradeLevel++;
      this.xp -= this.xpToNextLevel;
      this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.2);
      this.showUpgradeMenu();
  }

  showUpgradeMenu() {
      this.isPaused = true;
      const menu = document.getElementById('upgrade-menu');
      const optionsContainer = document.getElementById('upgrade-options');
      if (!menu || !optionsContainer) return;

      menu.style.display = 'flex';
      optionsContainer.innerHTML = '';

      const options = this.upgradeManager.getRandomUpgrades(4);

      options.forEach(opt => {
          const el = document.createElement('div');
          el.className = `upgrade-card rarity-${opt.rarity}`;
          el.innerHTML = `
            <div class="upgrade-icon">${opt.icon}</div>
            <h3>${opt.name}</h3>
            <p>${opt.description}</p>
            <div class="rarity-badge">${opt.rarity.toUpperCase()}</div>
          `;
          el.onclick = () => {
              this.upgradeManager.applyUpgrade(opt);
              this.resumeGame();
          };
          optionsContainer.appendChild(el);
      });
  }

  resumeGame() {
      const menu = document.getElementById('upgrade-menu');
      if (menu) menu.style.display = 'none';
      this.isPaused = false;
      this.lastTime = performance.now();
      this.updateUI();
  }

  updateUI() {
      const scoreEl = document.getElementById('score');
      if (scoreEl) scoreEl.innerText = this.score.toString();
      
      // Update Depth UI
      const depthDisplay = document.getElementById('depth-value-display');
      const depthFill = document.getElementById('depth-fill');
      const depthCursor = document.getElementById('depth-cursor');
      
      const depthPct = Math.min(100, (this.depth / 1000) * 100);

      if (depthDisplay) {
          depthDisplay.innerText = `${this.depth}m`;
      }
      if (depthFill) {
          depthFill.style.height = `${depthPct}%`;
      }
      if (depthCursor) {
          depthCursor.style.top = `${depthPct}%`;
      }

      const hpBar = document.getElementById('hp-bar');
      const hpText = document.getElementById('hp-text');
      if (hpBar && hpText) {
          if (this.isBossFight && this.kraken) {
              const pct = (this.kraken.hp / this.kraken.maxHp) * 100;
              hpBar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
              hpText.innerText = `KRAKEN: ${Math.ceil(this.kraken.hp)} / ${this.kraken.maxHp}`;
              hpBar.style.backgroundColor = '#9c27b0'; // Purple
          } else {
              const pct = (this.player.hp / this.player.maxHp) * 100;
              hpBar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
              hpText.innerText = `${Math.ceil(this.player.hp)} / ${this.player.maxHp}`;
              hpBar.style.backgroundColor = '#ff4444'; // Reset color
          }
      }

      const xpBar = document.getElementById('xp-bar');
      if (xpBar) {
          const pct = (this.xp / this.xpToNextLevel) * 100;
          xpBar.style.width = `${pct}%`;
      }
      
      // Inventory UI
      const inventoryEl = document.getElementById('inventory');
      if (inventoryEl) {
          inventoryEl.innerHTML = '';
          const inventory = this.upgradeManager.getInventory();
          inventory.forEach(item => {
              const el = document.createElement('div');
              el.className = 'inv-item';
              el.title = `${item.def.name} (Rank ${item.count})`;
              el.innerHTML = `
                <div class="inv-icon">${item.def.icon}</div>
                <div class="inv-rank">${item.count}</div>
              `;
              inventoryEl.appendChild(el);
          });
      }
  }
  
  gameOver() {
      this.isGameOver = true;
      const deathScreen = document.getElementById('death-screen');
      if (deathScreen) {
          deathScreen.style.display = 'flex';
          const deathLevel = document.getElementById('death-level');
          const deathScore = document.getElementById('death-score');
          if (deathLevel) deathLevel.innerText = `${this.depth}m`;
          if (deathScore) deathScore.innerText = this.score.toString();
      }
  }

  draw() {
    const maxDepth = 1000; 
    const t = Math.min(1, this.depth / maxDepth);
    
    // Surface color (Much lighter): rgb(0, 150, 220)
    // Deep color: rgb(0, 0, 0)
    const startR = 0, startG = 150, startB = 220;
    const endR = 0, endG = 0, endB = 0;

    const r = Math.floor(startR + (endR - startR) * t);
    const g = Math.floor(startG + (endG - startG) * t);
    const b = Math.floor(startB + (endB - startB) * t);
    
    this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`; 
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.translate(-this.camera.x, -this.camera.y);

    this.drawBackgroundGrid();
    
    // Draw Particles
    this.drawParticles(this.ctx);
    
    // Draw Surface (Sky) if near top
    if (this.camera.y < 50) {
        const surfaceY = 0;
        const waveHeight = 10;
        const waveLength = 50;
        const time = performance.now() / 200;
        
        this.ctx.fillStyle = '#87CEEB'; // Sky Blue
        this.ctx.beginPath();
        
        // Start Top Left
        this.ctx.moveTo(this.camera.x, this.camera.y);
        
        // Top Right
        this.ctx.lineTo(this.camera.x + this.canvas.width, this.camera.y);
        
        // Wave Line (Right to Left)
        for (let x = this.camera.x + this.canvas.width; x >= this.camera.x; x -= 10) {
             const y = surfaceY + Math.sin((x / waveLength) + time) * waveHeight 
                       + Math.sin((x / (waveLength * 0.5)) + (time * 1.5)) * (waveHeight * 0.3);
             this.ctx.lineTo(x, y);
        }
        
        // Close at Top Left
        this.ctx.closePath();
        this.ctx.fill();
        
        // White foam on the wave edge
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        for (let x = this.camera.x; x <= this.camera.x + this.canvas.width; x += 10) {
             const y = surfaceY + Math.sin((x / waveLength) + time) * waveHeight 
                       + Math.sin((x / (waveLength * 0.5)) + (time * 1.5)) * (waveHeight * 0.3);
             if (x === this.camera.x) this.ctx.moveTo(x, y);
             else this.ctx.lineTo(x, y);
        }
        this.ctx.stroke();
    }

    // Draw Game Entities
    this.treasureChests.forEach(c => c.draw(this.ctx));
    this.xpOrbs.forEach(o => o.draw(this.ctx));
    this.depthCharges.forEach(d => d.draw(this.ctx));
    this.explosions.forEach(e => e.draw(this.ctx));
    this.enemies.forEach(e => e.draw(this.ctx));
    if (this.kraken && this.isBossFight) this.kraken.draw(this.ctx);
    this.projectiles.forEach(p => p.draw(this.ctx));
    this.player.draw(this.ctx);
    
    // Draw Sea Floor
    this.drawSeaFloor(this.ctx);

    this.ctx.restore();
    
    // UI Overlay Messages
    if (this.depth > 900 && !this.isBossFight) {
        this.ctx.save();
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 30px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = 'black';
        this.ctx.shadowBlur = 5;
        this.ctx.fillText("Search the seabed! Find the abyssal trench!", this.canvas.width/2, this.canvas.height - 100);
        
        if (this.trenchX !== null) {
             const dist = Math.abs(this.player.position.x - this.trenchX);
             if (dist > 7500) { // 300m * 25 = 7500
                 this.ctx.fillText("The water goes no deeper this way!", this.canvas.width/2, this.canvas.height - 60);
             }
        }
        this.ctx.restore();
    }
  }

  drawBackgroundGrid() {
      const gridSize = 128; 
      
      if (!this.bgPattern) {
          this.bgPattern = SpriteFactory.createPattern('background_tile');
      }
      
      if (this.bgPattern) {
         this.ctx.save();
         this.ctx.fillStyle = this.bgPattern;
         const viewL = this.camera.x;
         const viewT = this.camera.y;
         this.ctx.fillRect(viewL - gridSize, viewT - gridSize, this.canvas.width + gridSize * 2, this.canvas.height + gridSize * 2);
         this.ctx.restore();
      } else {
        this.ctx.strokeStyle = '#003366';
      }
  }
  
  bgPattern: CanvasPattern | null = null;
}
