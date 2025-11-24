import { Player } from './entities/Player';
import { Enemy, MonsterStats } from './entities/Enemy';
import { OrbitProjectile } from './entities/OrbitProjectile';
import { Projectile } from './entities/Projectile';
import { XPOrb } from './entities/XPOrb';
import { DepthCharge } from './entities/NewEntities';
import { Explosion } from './entities/Explosion';
import { TreasureChest } from './entities/TreasureChest';
import { Kraken } from './entities/Kraken';
import { Obstacle } from './entities/Obstacle';
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
  obstacles: Obstacle[] = [];
  
  upgradeManager: UpgradeManager;
  
  // Boss Fight Arena
  arenaBounds: { minX: number; maxX: number; minY: number; maxY: number } | null = null;
  
  // Game State
  isMinigameActive: boolean = false;
  minigameCursor: number = 0; // 0 to 1
  minigameDirection: number = 1; 
  minigameShowingReward: boolean = false;
  
  // Debug
  isDebugMenuOpen: boolean = false;
  disableLevelUp: boolean = false;

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
        // Toggle Debug Menu
        if (e.key === '`') {
            this.toggleDebugMenu();
        }
    });

    this.setupRestart();
    this.initParticleDefs();

    this.player = new Player(this, 0, 0);
    this.upgradeManager = new UpgradeManager(this);
    
    // Initialize Debug Menu after UpgradeManager is ready
    this.setupDebugMenu();
    
    // Override Player spawn methods to hook into Game
    this.player.spawnDepthCharge = () => {
        this.depthCharges.push(new DepthCharge(this, this.player.position.x, this.player.position.y));
    };
    
    // Spawn initial treasure chests
    this.spawnInitialChests();
  }
  
  setupDebugMenu() {
      const menu = document.getElementById('debug-menu');
      const depthSlider = document.getElementById('debug-depth-slider') as HTMLInputElement;
      const depthVal = document.getElementById('debug-depth-val');
      const powerupsContainer = document.getElementById('debug-powerups');
      const xpButton = document.getElementById('debug-add-xp');
      const invulnCheckbox = document.getElementById('debug-invulnerable') as HTMLInputElement;
      const speedCheckbox = document.getElementById('debug-speed') as HTMLInputElement;
      const noLevelUpCheckbox = document.getElementById('debug-no-level-up') as HTMLInputElement;
      
      if (!menu || !depthSlider || !powerupsContainer || !xpButton || !invulnCheckbox || !speedCheckbox || !noLevelUpCheckbox) return;
      
      // Depth Slider Logic
      depthSlider.oninput = (e: any) => {
          const meters = parseInt(e.target.value);
          if (depthVal) depthVal.innerText = meters.toString();
          
          const PIXELS_PER_METER = 25;
          this.player.position.y = meters * PIXELS_PER_METER;
          
          // Update trench logic triggers
          if (meters < 900 && this.isBossFight) {
              // Reset boss fight if pulled out? maybe not for now
          }
      };
      
      // Add XP Button
      xpButton.onclick = () => {
          this.collectXP(100);
          this.updateUI();
      };
      
      // Invulnerability Checkbox
      invulnCheckbox.onchange = (e: any) => {
          this.player.isInvulnerable = e.target.checked;
      };
      
      // Speed Checkbox (5x speed)
      const normalSpeed = 200;
      speedCheckbox.onchange = (e: any) => {
          if (e.target.checked) {
              this.player.speed = normalSpeed * 5; // 1000
          } else {
              this.player.speed = normalSpeed; // 200
          }
      };
      
      // No Level Up Checkbox
      noLevelUpCheckbox.onchange = (e: any) => {
          this.disableLevelUp = e.target.checked;
      };
      
      // Populate Power Ups
      this.upgradeManager.upgrades.forEach(up => {
          const btn = document.createElement('button');
          btn.innerText = `${up.icon} ${up.name}`;
          btn.title = up.description;
          btn.style.padding = '5px';
          btn.style.cursor = 'pointer';
          btn.style.textAlign = 'left';
          btn.onclick = () => {
              this.upgradeManager.applyUpgrade(up);
              this.updateUI();
          };
          powerupsContainer.appendChild(btn);
      });
      
      // Add "Jump to Boss Fight" button
      const bossButton = document.createElement('button');
      bossButton.innerText = 'Jump to Boss Fight';
      bossButton.style.padding = '10px';
      bossButton.style.cursor = 'pointer';
      bossButton.style.width = '100%';
      bossButton.style.marginTop = '20px';
      bossButton.style.backgroundColor = '#9c27b0';
      bossButton.style.color = 'white';
      bossButton.style.border = 'none';
      bossButton.style.borderRadius = '4px';
      bossButton.style.fontWeight = 'bold';
      bossButton.onclick = () => {
          this.enterBossFight();
          this.updateUI();
      };
      const firstChild = menu.firstChild;
      if (firstChild && firstChild.nextSibling) {
          menu.insertBefore(bossButton, firstChild.nextSibling);
      } else {
          menu.appendChild(bossButton);
      }
  }
  
  toggleDebugMenu() {
      this.isDebugMenuOpen = !this.isDebugMenuOpen;
      const menu = document.getElementById('debug-menu');
      if (menu) {
          menu.style.display = this.isDebugMenuOpen ? 'block' : 'none';
      }
      
      // Sync slider with current depth
      if (this.isDebugMenuOpen) {
          const depthSlider = document.getElementById('debug-depth-slider') as HTMLInputElement;
          const depthVal = document.getElementById('debug-depth-val');
          if (depthSlider) {
              depthSlider.value = this.depth.toString();
              if (depthVal) depthVal.innerText = this.depth.toString();
          }
      }
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
      // Don't draw seabed during boss fight
      if (this.isBossFight) return;
      
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

      // Draw Sand Layer (base) - but skip trench area
      ctx.fillStyle = floorColor;
      if (this.trenchX !== null) {
          const trenchWidth = 500;
          const trenchLeft = this.trenchX - trenchWidth/2;
          const trenchRight = this.trenchX + trenchWidth/2;
          
          // Draw left side of sand
          if (trenchLeft > this.camera.x) {
              ctx.fillRect(this.camera.x, floorY, trenchLeft - this.camera.x, 50);
          }
          // Draw right side of sand
          if (trenchRight < this.camera.x + this.canvas.width) {
              ctx.fillRect(trenchRight, floorY, (this.camera.x + this.canvas.width) - trenchRight, 50);
          }
          
          // Draw trench hole (dark void)
          ctx.fillStyle = '#000010'; // Almost black blue
          ctx.fillRect(trenchLeft, floorY, trenchWidth, 2000);
      } else {
          // No trench yet, draw full sand layer
          ctx.fillRect(this.camera.x, floorY, this.canvas.width, 50);
      }

      // Procedural details
      // Iterate across the screen width in steps
      const step = 40;
      // Align startX to grid to prevent jitter when moving
      const startX = Math.floor(this.camera.x / step) * step;
      const endX = startX + this.canvas.width + step;
      
      // Get trench bounds if exists
      let trenchLeft = -Infinity;
      let trenchRight = Infinity;
      if (this.trenchX !== null) {
          const trenchWidth = 500;
          trenchLeft = this.trenchX - trenchWidth/2;
          trenchRight = this.trenchX + trenchWidth/2;
      }

      for (let x = startX; x <= endX; x += step) {
          // Skip if in trench area
          if (x + step/2 >= trenchLeft && x + step/2 <= trenchRight) {
              continue;
          }
          
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
        
        // Arena boundaries - keep player in bounds
        if (this.arenaBounds) {
            if (this.player.position.x < this.arenaBounds.minX) {
                this.player.position.x = this.arenaBounds.minX;
            }
            if (this.player.position.x > this.arenaBounds.maxX) {
                this.player.position.x = this.arenaBounds.maxX;
            }
            if (this.player.position.y < this.arenaBounds.minY) {
                this.player.position.y = this.arenaBounds.minY;
            }
            if (this.player.position.y > this.arenaBounds.maxY) {
                this.player.position.y = this.arenaBounds.maxY;
            }
        }
        
        // Update camera to follow player during boss fight
        this.camera.x = this.player.position.x - this.canvas.width / 2;
        this.camera.y = this.player.position.y - this.canvas.height / 2;
        
        // Update Enemies
        this.enemies.forEach(e => e.update(dt));
        this.enemies = this.enemies.filter(e => e.active);
        
        // Update XP Orbs
        this.xpOrbs.forEach(o => o.update(dt));
        this.xpOrbs = this.xpOrbs.filter(o => o.active);
        
        // Update Projectiles
        this.projectiles.forEach(p => p.update(dt));
        this.projectiles = this.projectiles.filter(p => p.active);
        
        // Update Explosions
        this.explosions.forEach(e => e.update(dt));
        this.explosions = this.explosions.filter(e => e.active);
        
        // Update Depth Charges
        this.depthCharges.forEach(d => d.update(dt));
        this.depthCharges = this.depthCharges.filter(d => d.active);
        
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
    
    // Check for trench entry - player must be at seabed level AND within trench bounds
    if (this.trenchX !== null && !this.isBossFight) {
        const trenchWidth = 500;
        const trenchLeft = this.trenchX - trenchWidth/2;
        const trenchRight = this.trenchX + trenchWidth/2;
        
        // Check if player is at seabed level (within 50 pixels of floor)
        const floorY = MAX_DEPTH_PIXELS;
        const isAtSeabed = Math.abs(this.player.position.y - floorY) < 50;
        
        // Check if player is within trench bounds horizontally
        const isInTrenchX = this.player.position.x >= trenchLeft && this.player.position.x <= trenchRight;
        
        if (isAtSeabed && isInTrenchX) {
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
    
    // No longer spawning chests randomly - they're all spawned at start

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

  spawnInitialChests() {
      const PIXELS_PER_METER = 25;
      const AREA_SIZE_METERS = 100;
      const AREA_SIZE_PIXELS = AREA_SIZE_METERS * PIXELS_PER_METER; // 2500 pixels
      const TOTAL_CHESTS = 100;
      
      // Create a 10x10 grid centered on player (0, 0)
      // Each cell is 100x100 meters
      const gridSize = Math.ceil(Math.sqrt(TOTAL_CHESTS)); // 10x10 grid
      const halfGrid = Math.floor(gridSize / 2);
      
      const usedAreas = new Set<string>();
      
      for (let i = 0; i < TOTAL_CHESTS; i++) {
          let gridX, gridY;
          let attempts = 0;
          
          // Find an unused grid cell
          do {
              gridX = Math.floor(Math.random() * gridSize) - halfGrid;
              gridY = Math.floor(Math.random() * gridSize) - halfGrid;
              attempts++;
          } while (usedAreas.has(`${gridX},${gridY}`) && attempts < 1000);
          
          if (attempts >= 1000) break; // Safety check
          
          usedAreas.add(`${gridX},${gridY}`);
          
          // Calculate the center of this grid cell in pixels
          const cellCenterX = gridX * AREA_SIZE_PIXELS + AREA_SIZE_PIXELS / 2;
          const cellCenterY = gridY * AREA_SIZE_PIXELS + AREA_SIZE_PIXELS / 2;
          
          // Spawn chest at random location within this 100x100 meter area
          const offsetX = (Math.random() - 0.5) * AREA_SIZE_PIXELS * 0.8; // 80% of area to avoid edges
          const offsetY = (Math.random() - 0.5) * AREA_SIZE_PIXELS * 0.8;
          
          const chestX = cellCenterX + offsetX;
          const chestY = cellCenterY + offsetY;
          
          this.treasureChests.push(new TreasureChest(this, chestX, chestY));
      }
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
      
      // Filter out upgrades that have reached max rank
      const upgrades = this.upgradeManager.upgrades.filter(u => {
        if (u.rarity !== rarity) return false;
        const playerUpgrade = this.upgradeManager.playerUpgrades.get(u.id);
        if (playerUpgrade && u.maxRank) {
          return playerUpgrade.count < u.maxRank;
        }
        return true;
      });
      
      // If no upgrades available for this rarity, try any rarity
      const availableUpgrades = upgrades.length > 0 ? upgrades : this.upgradeManager.upgrades.filter(u => {
        const playerUpgrade = this.upgradeManager.playerUpgrades.get(u.id);
        if (playerUpgrade && u.maxRank) {
          return playerUpgrade.count < u.maxRank;
        }
        return true;
      });
      
      const pick = availableUpgrades[Math.floor(Math.random() * availableUpgrades.length)];
      
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
      }, 2800);
  }

  enterBossFight() {
      this.isBossFight = true;
      this.enemies = [];
      this.projectiles = [];
      this.depthCharges = [];
      this.treasureChests = [];
      this.xpOrbs = [];
      this.obstacles = [];
      
      // Teleport to deep dark ocean arena
      // Center player and kraken in a large arena
      const arenaCenterX = 0;
      const arenaCenterY = 0; // Start at origin for boss fight
      const arenaSize = 3000; // Large square arena (50% larger)
      
      // Set arena boundaries
      this.arenaBounds = {
          minX: arenaCenterX - arenaSize / 2,
          maxX: arenaCenterX + arenaSize / 2,
          minY: arenaCenterY - arenaSize / 2,
          maxY: arenaCenterY + arenaSize / 2
      };
      
      this.player.position.x = arenaCenterX;
      this.player.position.y = arenaCenterY;
      this.kraken = new Kraken(this, arenaCenterX, arenaCenterY - 200); // Kraken above player
      
      // Spawn themed obstacles
      this.spawnBossObstacles(arenaCenterX, arenaCenterY, arenaSize);
      
      // Reset camera to center on player
      this.camera.x = arenaCenterX - this.canvas.width / 2;
      this.camera.y = arenaCenterY - this.canvas.height / 2;
      
      // UI Updates
      const depthMeter = document.getElementById('depth-meter-container');
      if (depthMeter) depthMeter.style.display = 'none';
  }
  
  spawnBossObstacles(centerX: number, centerY: number, arenaSize: number) {
      // Spawn tentacle barriers around the arena (longer tentacles)
      const tentacleCount = 8;
      const tentacleMinDist = 400; // Minimum distance from center
      const tentacleMaxDist = arenaSize / 2 - 150; // Maximum distance from center
      
      for (let i = 0; i < tentacleCount; i++) {
          const angle = (Math.PI * 2 / tentacleCount) * i + Math.random() * 0.3;
          const dist = tentacleMinDist + Math.random() * (tentacleMaxDist - tentacleMinDist);
          const x = centerX + Math.cos(angle) * dist;
          const y = centerY + Math.sin(angle) * dist;
          
          // Longer tentacle barriers
          const radius = 200 + Math.random() * 100; // Much longer (was 40-70)
          this.obstacles.push(new Obstacle(this, x, y, radius, 'tentacle_barrier'));
      }
  }
  
  winGame() {
      this.isGameOver = true;
      // Show Victory Screen
      const deathScreen = document.getElementById('death-screen');
      if (deathScreen) {
          deathScreen.style.display = 'flex';
          const h1 = deathScreen.querySelector('h1');
          if (h1) h1.innerText = "YOU CONQUERED THE ABYSS!";
          
          // Hide default death screen stats (they're for regular death, not victory)
          const deathLevel = document.getElementById('death-level');
          const deathScore = document.getElementById('death-score');
          if (deathLevel) deathLevel.parentElement!.style.display = 'none';
          if (deathScore) deathScore.parentElement!.style.display = 'none';
          
          // Remove existing victory stats if any (to prevent duplicates)
          const existingStats = deathScreen.querySelector('.victory-stats');
          if (existingStats) {
              existingStats.remove();
          }
          
          // Calculate total power ups
          const inventory = this.upgradeManager.getInventory();
          const totalPowerUps = inventory.reduce((sum, item) => sum + item.count, 0);
          const uniquePowerUps = inventory.length;
          
          // Add stats
          const stats = document.createElement('div');
          stats.className = 'victory-stats';
          stats.innerHTML = `
            <p class="death-stat">Time Played: <span>${Math.floor(this.lastTime / 1000)}s</span></p>
            <p class="death-stat">Boss Fight Duration: <span>${Math.floor(this.bossFightTimer)}s</span></p>
            <p class="death-stat">Total Power Ups Collected: <span>${totalPowerUps}</span></p>
            <p class="death-stat">Unique Power Ups: <span>${uniquePowerUps}</span></p>
            <p class="death-stat">Final Score: <span>${this.score}</span></p>
            <p class="death-stat">Max Depth: <span>${this.depth}m</span></p>
          `;
          const restartBtn = document.getElementById('restart-btn');
          if (restartBtn) {
              deathScreen.insertBefore(stats, restartBtn);
          } else {
              deathScreen.appendChild(stats);
          }
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
          
          // Player vs XP Orbs (boss fight)
          for (const orb of this.xpOrbs) {
              if (orb.position.distanceTo(this.player.position) < (orb.radius + this.player.radius)) {
                  this.collectXP(orb.value);
                  orb.active = false;
              }
          }
          
          // Depth Charges vs Enemies (boss fight)
          this.depthCharges.forEach(dc => {
              if (!dc.active) return;
              for (const enemy of this.enemies) {
                  if (dc.position.distanceTo(enemy.position) < (dc.radius + enemy.radius)) {
                      dc.explode();
                      break;
                  }
              }
          });
          
          // Depth Charges vs Kraken
          if (this.kraken) {
              this.depthCharges.forEach(dc => {
                  if (!dc.active) return;
                  if (dc.position.distanceTo(this.kraken!.position) < (dc.radius + this.kraken!.radius)) {
                      this.kraken!.takeDamage(100); // Damage kraken
                      dc.explode();
                  }
              });
          }
          
          // Player vs Obstacles
          for (const obstacle of this.obstacles) {
              if (!obstacle.active) continue;
              
              if (obstacle.type === 'tentacle_barrier') {
                  // Check collision with tentacle line segments
                  const time = performance.now() / 500;
                  let collided = false;
                  
                  for(let i=0; i<4; i++) {
                      const angle = (Math.PI * 2 / 4) * i + Math.sin(time + i) * 0.3;
                      const endX = obstacle.position.x + Math.cos(angle) * obstacle.radius;
                      const endY = obstacle.position.y + Math.sin(angle) * obstacle.radius;
                      
                      // Check distance from player to line segment
                      const lineStart = obstacle.position;
                      const lineEnd = new Vector2(endX, endY);
                      const playerPos = this.player.position;
                      
                      // Vector from line start to end
                      const lineVec = lineEnd.sub(lineStart);
                      const lineLen = lineVec.length();
                      if (lineLen === 0) continue;
                      
                      // Vector from line start to player
                      const toPlayer = playerPos.sub(lineStart);
                      
                      // Project player onto line (dot product: a.x * b.x + a.y * b.y)
                      const dotProduct = toPlayer.x * lineVec.x + toPlayer.y * lineVec.y;
                      const t = Math.max(0, Math.min(1, dotProduct / (lineLen * lineLen)));
                      const closestPoint = lineStart.add(lineVec.scale(t));
                      
                      // Check distance from player to closest point on line
                      const distToLine = playerPos.distanceTo(closestPoint);
                      const tentacleWidth = 15; // Line width
                      
                      if (distToLine < this.player.radius + tentacleWidth) {
                          // Push player away from tentacle
                          const pushDir = playerPos.sub(closestPoint).normalize();
                          if (pushDir.length() > 0) {
                              const overlap = (this.player.radius + tentacleWidth) - distToLine;
                              this.player.position = this.player.position.add(pushDir.scale(overlap + 2));
                          }
                          collided = true;
                      }
                  }
                  
                  if (collided) continue;
              }
              // Seaweed doesn't block, just slows (handled in update)
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
      this.xp += amount;
      if (this.xp >= this.xpToNextLevel && !this.disableLevelUp) {
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

      // Player HP Bar
      const hpBar = document.getElementById('hp-bar');
      const hpText = document.getElementById('hp-text');
      if (hpBar && hpText) {
          const pct = (this.player.hp / this.player.maxHp) * 100;
          hpBar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
          hpText.innerText = `${Math.ceil(this.player.hp)} / ${this.player.maxHp}`;
          // Flash bright red when taking damage
          if (this.player.damageFlashTimer > 0) {
              hpBar.style.backgroundColor = '#ff0000'; // Bright red
          } else {
              hpBar.style.backgroundColor = '#ff4444'; // Normal red
          }
      }
      
      // Boss HP Bar
      const bossHpContainer = document.getElementById('boss-hp-bar-container');
      const bossHpBar = document.getElementById('boss-hp-bar');
      const bossHpText = document.getElementById('boss-hp-text');
      const phaseIndicator = document.getElementById('boss-phase-indicator');
      const phaseText = document.getElementById('boss-phase-text');
      if (bossHpContainer && bossHpBar && bossHpText) {
          if (this.isBossFight && this.kraken) {
              bossHpContainer.style.display = 'block';
              const pct = (this.kraken.hp / this.kraken.maxHp) * 100;
              bossHpBar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
              bossHpText.innerText = `KRAKEN: ${Math.ceil(this.kraken.hp)} / ${this.kraken.maxHp}`;
              
              // Phase indicator
              if (phaseIndicator && phaseText) {
                  phaseIndicator.style.display = 'block';
                  const phaseNames = ['', 'PHASE 1', 'PHASE 2', 'FINAL PHASE'];
                  const phaseColors = ['', '#9c27b0', '#ff5722', '#ff0000'];
                  phaseText.innerText = phaseNames[this.kraken.phase];
                  phaseText.style.color = phaseColors[this.kraken.phase];
                  phaseIndicator.style.textShadow = `0 0 10px ${phaseColors[this.kraken.phase]}, 2px 2px 4px black`;
              }
          } else {
              bossHpContainer.style.display = 'none';
              if (phaseIndicator) phaseIndicator.style.display = 'none';
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
          const h1 = deathScreen.querySelector('h1');
          if (h1) h1.innerText = "Your sub imploded!";
          
          // Show default death screen stats and hide victory stats
          const deathLevel = document.getElementById('death-level');
          const deathScore = document.getElementById('death-score');
          if (deathLevel) {
              deathLevel.innerText = `${this.depth}m`;
              deathLevel.parentElement!.style.display = 'block';
          }
          if (deathScore) {
              deathScore.innerText = this.score.toString();
              deathScore.parentElement!.style.display = 'block';
          }
          
          // Remove victory stats if any
          const victoryStats = deathScreen.querySelector('.victory-stats');
          if (victoryStats) {
              victoryStats.remove();
          }
      }
  }

  draw() {
    // Boss fight has different background
    if (this.isBossFight) {
        // Draw black background first
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw gradient from blue to black
        if (this.arenaBounds) {
            const arenaScreenX = this.arenaBounds.minX - this.camera.x;
            const arenaScreenY = this.arenaBounds.minY - this.camera.y;
            const arenaWidth = this.arenaBounds.maxX - this.arenaBounds.minX;
            const arenaHeight = this.arenaBounds.maxY - this.arenaBounds.minY;
            
            // Create radial gradient from center of arena
            const centerScreenX = (this.arenaBounds.minX + this.arenaBounds.maxX) / 2 - this.camera.x;
            const centerScreenY = (this.arenaBounds.minY + this.arenaBounds.maxY) / 2 - this.camera.y;
            const maxDist = Math.max(arenaWidth, arenaHeight) / 2;
            
            const gradient = this.ctx.createRadialGradient(
                centerScreenX, centerScreenY, 0,
                centerScreenX, centerScreenY, maxDist
            );
            gradient.addColorStop(0, '#000033'); // Dark blue at center
            gradient.addColorStop(0.7, '#000022'); // Darker blue
            gradient.addColorStop(1, '#000000'); // Black at edges
            
            this.ctx.fillStyle = gradient;
            // Fill a larger area to cover gradient fade
            const padding = maxDist;
            this.ctx.fillRect(
                arenaScreenX - padding, 
                arenaScreenY - padding, 
                arenaWidth + padding * 2, 
                arenaHeight + padding * 2
            );
        }
    } else {
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
    }

    this.ctx.save();
    this.ctx.translate(-this.camera.x, -this.camera.y);

    // Don't draw background/particles during boss fight
    if (!this.isBossFight) {
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
    }

    // Draw Game Entities
    this.treasureChests.forEach(c => c.draw(this.ctx));
    this.xpOrbs.forEach(o => o.draw(this.ctx));
    this.depthCharges.forEach(d => d.draw(this.ctx));
    this.explosions.forEach(e => e.draw(this.ctx));
    this.enemies.forEach(e => e.draw(this.ctx));
    if (this.kraken && this.isBossFight) this.kraken.draw(this.ctx);
    
    // Draw obstacles (boss fight only)
    if (this.isBossFight) {
        this.obstacles.forEach(obs => obs.draw(this.ctx));
    }
    this.projectiles.forEach(p => p.draw(this.ctx));
    this.player.draw(this.ctx);
    
    // Draw Sea Floor (only if not boss fight)
    if (!this.isBossFight) {
        this.drawSeaFloor(this.ctx);
    }

    this.ctx.restore();
    
    // UI Overlay Messages
    if (this.depth >= 982 && !this.isBossFight) {
        this.ctx.save();
        this.ctx.font = 'bold 30px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = 'black';
        this.ctx.shadowBlur = 5;
        
        if (this.trenchX !== null) {
             const dist = Math.abs(this.player.position.x - this.trenchX);
             const distMeters = dist / 25; // Convert pixels to meters
             
             // Check if going wrong way (more than 300m away)
             if (distMeters > 300) {
                 this.ctx.fillStyle = 'red';
                 this.ctx.fillText("The sonar shows only flat in this direction!", this.canvas.width/2, this.canvas.height - 60);
             }
             // Check if going right way and within 100m
             else if (distMeters <= 100) {
                 this.ctx.fillStyle = 'green';
                 this.ctx.fillText("The sonar is pinging something very large ahead!", this.canvas.width/2, this.canvas.height - 60);
             }
        }
        
        // Main message
        this.ctx.fillStyle = 'white';
        this.ctx.fillText("Search the seabed! Find the abyssal trench!", this.canvas.width/2, this.canvas.height - 100);
        
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
