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
import { HealthPack } from './entities/HealthPack';
import { Vector2 } from './utils';
import { UpgradeManager } from './UpgradeManager';
import monstersData from './data/monsters.json';
import { SpriteFactory } from './graphics/SpriteFactory';
import { SoundManager } from './SoundManager';

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
  healthPacks: HealthPack[] = [];
  
  upgradeManager: UpgradeManager;
  soundManager: SoundManager;
  
  // Track upgrades that have been seen in level up menu
  seenUpgrades: Set<string> = new Set();
  
  // Boss Fight Arena
  arenaBounds: { minX: number; maxX: number; minY: number; maxY: number } | null = null;
  
  // Game State
  isMinigameActive: boolean = false;
  minigameCursor: number = 0; // 0 to 1
  minigameDirection: number = 1; 
  minigameShowingReward: boolean = false;
  minigameLastCursor: number = 0; // Track previous cursor position to detect bounces
  
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
  isPaused: boolean = true; // Start paused until start button is clicked
  isGameOver: boolean = false;
  
  // Stats tracking
  totalDamageDealt: number = 0;
  enemyKills: Map<string, number> = new Map();
  gameStartTime: number = 0;
  
  mousePosition: Vector2 = new Vector2(0, 0);

  // Camera
  camera: Vector2 = new Vector2(0, 0);
  cameraShake: Vector2 = new Vector2(0, 0);
  shakeIntensity: number = 0;
  
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
        // Toggle Esc Menu
        if (e.key === 'Escape') {
            this.toggleEscMenu();
        }
    });

    this.setupRestart();
    this.initParticleDefs();

    this.soundManager = new SoundManager();
    this.soundManager.loadSettings();
    this.player = new Player(this, 0, 75); // Start at y=75 (below surface at y=0)
    this.upgradeManager = new UpgradeManager(this);
    
    // Initialize Debug Menu after UpgradeManager is ready
    this.setupDebugMenu();
    
    // Setup Settings Menu
    this.setupSettingsMenu();
    
    // Setup Esc Menu
    this.setupEscMenu();
    
    // Setup Upgrade Menu Button
    this.setupUpgradeMenuButton();
    
    // Setup Start Screen
    this.setupStartScreen();
    
    // Override Player spawn methods to hook into Game
    this.player.spawnDepthCharge = () => {
        this.depthCharges.push(new DepthCharge(this, this.player.position.x, this.player.position.y));
    };
    
    // Spawn initial treasure chests
    this.spawnInitialChests();
  }
  
  setupSettingsMenu() {
      const settingsBtn = document.getElementById('settings-btn');
      const settingsMenu = document.getElementById('settings-menu');
      const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
      const volumeValue = document.getElementById('volume-value');
      const ambientCheckbox = document.getElementById('ambient-sound-checkbox') as HTMLInputElement;
      const closeBtn = document.getElementById('settings-close-btn');
      
      if (!settingsBtn || !settingsMenu || !volumeSlider || !volumeValue || !ambientCheckbox || !closeBtn) return;
      
      const openMenu = () => {
          if (this.isGameOver) return; // Don't open settings if game is over
          // Close Esc menu if it's open
          const escMenu = document.getElementById('esc-menu');
          if (escMenu && escMenu.style.display === 'flex') {
              this.closeEscMenu();
          }
          settingsMenu.style.display = 'flex';
          this.isPaused = true;
          this.soundManager.playUIClick();
      };
      
      const closeMenu = () => {
          this.closeSettingsMenu();
      };
      
      settingsBtn.onclick = () => {
          if (settingsMenu.style.display === 'flex') {
              closeMenu();
          } else {
              openMenu();
          }
      };
      
      closeBtn.onclick = () => {
          closeMenu();
      };
      
      // Update volume slider from saved value
      const savedVolume = this.soundManager.getMasterVolume();
      volumeSlider.value = (savedVolume * 100).toString();
      volumeValue.innerText = `${Math.round(savedVolume * 100)}%`;
      
      // Update ambient sound checkbox from saved value
      const ambientEnabled = this.soundManager.getAmbientSoundEnabled();
      ambientCheckbox.checked = ambientEnabled;
      
      // Handle ambient sound checkbox change
      ambientCheckbox.onchange = () => {
          const enabled = ambientCheckbox.checked;
          this.soundManager.setAmbientSoundEnabled(enabled);
          this.soundManager.playUIClick();
      };
      
      // Throttle sound playback to avoid too many sounds when dragging
      let lastSoundTime = 0;
      const soundThrottle = 150; // Play sound at most every 150ms
      
      volumeSlider.oninput = (e: any) => {
          const volume = parseInt(e.target.value) / 100;
          this.soundManager.setMasterVolume(volume);
          volumeValue.innerText = `${Math.round(volume * 100)}%`;
          
          // Play a subtle test sound at the current volume level (async to not block dragging)
          const now = performance.now();
          if (now - lastSoundTime > soundThrottle) {
              // Use setTimeout to make it async and not block slider movement
              setTimeout(() => {
                  this.soundManager.playVolumeTest(0.3);
              }, 0);
              lastSoundTime = now;
          }
      };
  }
  
  setupEscMenu() {
      const escMenu = document.getElementById('esc-menu');
      const closeBtn = document.getElementById('esc-menu-close-btn');
      
      if (!escMenu || !closeBtn) return;
      
      closeBtn.onclick = () => {
          this.closeEscMenu();
      };
  }
  
  setupUpgradeMenuButton() {
      const upgradeMenuBtn = document.getElementById('upgrade-menu-btn');
      if (!upgradeMenuBtn) return;
      
      upgradeMenuBtn.onclick = () => {
          // Don't allow opening menu during game over, minigame, or upgrade selection
          if (this.isGameOver || this.isMinigameActive) return;
          
          const settingsMenu = document.getElementById('settings-menu');
          const upgradeMenu = document.getElementById('upgrade-menu');
          const escMenu = document.getElementById('esc-menu');
          
          // Check if other menus are open
          const settingsOpen = settingsMenu && settingsMenu.style.display === 'flex';
          const upgradeOpen = upgradeMenu && upgradeMenu.style.display === 'flex';
          
          // Close settings menu if open
          if (settingsOpen) {
              this.closeSettingsMenu();
          }
          
          // Don't open if upgrade menu is open (player must select an upgrade)
          if (upgradeOpen) {
              return;
          }
          
          // Toggle Esc menu
          const isOpen = escMenu && escMenu.style.display === 'flex';
          if (isOpen) {
              this.closeEscMenu();
          } else {
              this.openEscMenu();
          }
      };
  }
  
  toggleEscMenu() {
      const escMenu = document.getElementById('esc-menu');
      const settingsMenu = document.getElementById('settings-menu');
      const upgradeMenu = document.getElementById('upgrade-menu');
      
      if (!escMenu) return;
      
      // Don't allow opening menu during game over or minigame
      if (this.isGameOver || this.isMinigameActive) return;
      
      // Check if other menus are open - close them first
      const settingsOpen = settingsMenu && settingsMenu.style.display === 'flex';
      const upgradeOpen = upgradeMenu && upgradeMenu.style.display === 'flex';
      
      if (settingsOpen) {
          // Close settings menu if Esc is pressed
          this.closeSettingsMenu();
          return;
      }
      
      if (upgradeOpen) {
          // Don't allow closing upgrade menu with Esc (player must select an upgrade)
          return;
      }
      
      const isOpen = escMenu.style.display === 'flex';
      
      if (isOpen) {
          this.closeEscMenu();
      } else {
          this.openEscMenu();
      }
  }
  
  closeSettingsMenu() {
      const settingsMenu = document.getElementById('settings-menu');
      if (!settingsMenu) return;
      
      settingsMenu.style.display = 'none';
      this.isPaused = false;
      this.lastTime = performance.now();
      this.soundManager.playUIClick();
  }
  
  openEscMenu() {
      const escMenu = document.getElementById('esc-menu');
      const upgradesContainer = document.getElementById('esc-menu-upgrades-container');
      
      if (!escMenu || !upgradesContainer) return;
      
      // Populate upgrades
      this.populateEscMenu();
      
      // Show menu and pause game
      escMenu.style.display = 'flex';
      this.isPaused = true;
      this.soundManager.playUIClick();
  }
  
  closeEscMenu() {
      const escMenu = document.getElementById('esc-menu');
      if (!escMenu) return;
      
      escMenu.style.display = 'none';
      this.isPaused = false;
      this.lastTime = performance.now();
      this.soundManager.playUIClick();
  }
  
  populateEscMenu() {
      const upgradesContainer = document.getElementById('esc-menu-upgrades-container');
      if (!upgradesContainer) return;
      
      upgradesContainer.innerHTML = '';
      
      // Get all upgrades (not just acquired ones)
      const allUpgrades = this.upgradeManager.upgrades;
      
      // Get player's upgrades for checking ownership
      const playerUpgrades = this.upgradeManager.playerUpgrades;
      
      // Group upgrades by rarity
      const upgradesByRarity: { [key: string]: typeof allUpgrades } = {
          'legendary': [],
          'rare': [],
          'common': []
      };
      
      allUpgrades.forEach(upgrade => {
          if (upgradesByRarity[upgrade.rarity]) {
              upgradesByRarity[upgrade.rarity].push(upgrade);
          }
      });
      
      // Sort each group by name
      Object.keys(upgradesByRarity).forEach(rarity => {
          upgradesByRarity[rarity].sort((a, b) => a.name.localeCompare(b.name));
      });
      
      // Create sections for each rarity (legendary, rare, common)
      const rarityOrder = ['legendary', 'rare', 'common'];
      const rarityTitles = {
          'legendary': 'Legendary',
          'rare': 'Rare',
          'common': 'Common'
      };
      
      rarityOrder.forEach(rarity => {
          const upgrades = upgradesByRarity[rarity];
          if (upgrades.length === 0) return;
          
          // Create rarity group container
          const groupContainer = document.createElement('div');
          groupContainer.className = 'rarity-group';
          
          // Create title
          const title = document.createElement('div');
          title.className = `rarity-group-title ${rarity}`;
          title.textContent = rarityTitles[rarity as keyof typeof rarityTitles];
          groupContainer.appendChild(title);
          
          // Create grid for cards
          const grid = document.createElement('div');
          grid.className = 'rarity-group-grid';
          
          // Create cards for each upgrade in this rarity
          upgrades.forEach(upgrade => {
              const playerUpgrade = playerUpgrades.get(upgrade.id);
              const hasUpgrade = playerUpgrade !== undefined;
              const hasSeen = this.seenUpgrades.has(upgrade.id);
              const count = playerUpgrade ? playerUpgrade.count : 0;
              const isMaxed = upgrade.maxRank && count >= upgrade.maxRank;
              
              const card = document.createElement('div');
              // Only lock if not acquired (seen upgrades that aren't acquired still show description)
              card.className = `esc-upgrade-card rarity-${upgrade.rarity}${!hasUpgrade ? ' locked' : ''}`;
              
              let rankText = '';
              if (hasUpgrade) {
                  rankText = isMaxed ? `Rank ${count} (MAX)` : `Rank ${count}${upgrade.maxRank ? ` / ${upgrade.maxRank}` : ''}`;
              } else if (hasSeen) {
                  rankText = 'Not Acquired';
              } else {
                  rankText = 'Not Found';
              }
              
              // Show description if acquired or seen, otherwise show "???"
              const description = (hasUpgrade || hasSeen) ? upgrade.description : '???';
              
              card.innerHTML = `
                  <div class="esc-upgrade-icon">${upgrade.icon}</div>
                  <h4>${upgrade.name}</h4>
                  <p>${description}</p>
                  <div class="esc-upgrade-rank ${isMaxed ? 'maxed' : ''}">${rankText}</div>
              `;
              
              grid.appendChild(card);
          });
          
          groupContainer.appendChild(grid);
          upgradesContainer.appendChild(groupContainer);
      });
  }
  
  setupDebugMenu() {
      const menu = document.getElementById('debug-menu');
      const depthSlider = document.getElementById('debug-depth-slider') as HTMLInputElement;
      const depthVal = document.getElementById('debug-depth-val');
      const powerupsContainer = document.getElementById('debug-powerups');
      const maxAllButton = document.getElementById('debug-max-all-powerups');
      const levelUpButton = document.getElementById('debug-level-up');
      const maxLegendaryButton = document.getElementById('debug-max-all-legendary');
      const maxRareButton = document.getElementById('debug-max-all-rare');
      const invulnCheckbox = document.getElementById('debug-invulnerable') as HTMLInputElement;
      const speedCheckbox = document.getElementById('debug-speed') as HTMLInputElement;
      const noLevelUpCheckbox = document.getElementById('debug-no-level-up') as HTMLInputElement;
      
      if (!menu || !depthSlider || !powerupsContainer || !maxAllButton || !levelUpButton || !maxLegendaryButton || !maxRareButton || !invulnCheckbox || !speedCheckbox || !noLevelUpCheckbox) return;
      
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
      
      // Max All Power-Ups Button
      maxAllButton.onclick = () => {
          this.upgradeManager.upgrades.forEach(upgrade => {
              if (upgrade.maxRank) {
                  const currentUpgrade = this.upgradeManager.playerUpgrades.get(upgrade.id);
                  const currentCount = currentUpgrade ? currentUpgrade.count : 0;
                  const upgradesNeeded = upgrade.maxRank - currentCount;
                  
                  // Apply the upgrade until it reaches max rank
                  for (let i = 0; i < upgradesNeeded; i++) {
                      this.upgradeManager.applyUpgrade(upgrade);
                  }
              }
          });
          this.updateUI();
      };
      
      // Level Up Button
      levelUpButton.onclick = () => {
          this.levelUp();
      };
      
      // Max All Legendary Power-Ups Button
      maxLegendaryButton.onclick = () => {
          this.upgradeManager.upgrades.forEach(upgrade => {
              if (upgrade.rarity === 'legendary' && upgrade.maxRank) {
                  const currentUpgrade = this.upgradeManager.playerUpgrades.get(upgrade.id);
                  const currentCount = currentUpgrade ? currentUpgrade.count : 0;
                  const upgradesNeeded = upgrade.maxRank - currentCount;
                  
                  // Apply the upgrade until it reaches max rank
                  for (let i = 0; i < upgradesNeeded; i++) {
                      this.upgradeManager.applyUpgrade(upgrade);
                  }
              }
          });
          this.updateUI();
      };
      
      // Max All Rare Power-Ups Button
      maxRareButton.onclick = () => {
          this.upgradeManager.upgrades.forEach(upgrade => {
              if (upgrade.rarity === 'rare' && upgrade.maxRank) {
                  const currentUpgrade = this.upgradeManager.playerUpgrades.get(upgrade.id);
                  const currentCount = currentUpgrade ? currentUpgrade.count : 0;
                  const upgradesNeeded = upgrade.maxRank - currentCount;
                  
                  // Apply the upgrade until it reaches max rank
                  for (let i = 0; i < upgradesNeeded; i++) {
                      this.upgradeManager.applyUpgrade(upgrade);
                  }
              }
          });
          this.updateUI();
      };
      
      // Invulnerability Checkbox
      invulnCheckbox.onchange = (e: any) => {
          this.player.isInvulnerable = e.target.checked;
      };
      
      // Speed Checkbox (5x speed)
      const normalSpeed = 250;
      speedCheckbox.onchange = (e: any) => {
          if (e.target.checked) {
              this.player.speed = normalSpeed * 5; // 1250
          } else {
              this.player.speed = normalSpeed; // 250
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
      this.soundManager.playExplosion();
  }
  
  addScreenShake(intensity: number) {
      // Add to existing shake (can stack)
      this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }
  
  createSonarPulseVisual(center: Vector2, maxRadius: number, baseDamage: number, level: number) {
      // Create visual expanding pulse effect
      // Store pulse data for drawing and damage calculation
      if (!this.sonarPulses) {
          this.sonarPulses = [];
      }
      this.sonarPulses.push({
          center: new Vector2(center.x, center.y),
          radius: 0,
          maxRadius: maxRadius,
          lifetime: 5.0, // Pulse expands over 5 seconds (very slow)
          timeAlive: 0,
          baseDamage: baseDamage,
          level: level, // Store level for damage calculations
          hitEnemies: new Set(), // Track which enemies have been hit
          hitKraken: false // Track if kraken has been hit
      });
      
      // Play ping sound
      this.soundManager.playSonarPing();
  }
  
  sonarPulses: Array<{
      center: Vector2, 
      radius: number, 
      maxRadius: number, 
      lifetime: number, 
      timeAlive: number,
      baseDamage: number,
      level: number,
      hitEnemies: Set<any>,
      hitKraken: boolean
  }> = [];
  
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
             this.resetGame();
          };
      }
      
      // Also handle "DIVE AGAIN" button on victory screen
      const diveAgainBtn = document.getElementById('dive-again-btn');
      if (diveAgainBtn) {
          diveAgainBtn.onclick = () => {
             this.resetGame();
          };
      }
  }
  
  resetGame() {
      // Hide death screen
      const deathScreen = document.getElementById('death-screen');
      if (deathScreen) {
          deathScreen.style.display = 'none';
      }
      
      // Reset game state
      this.isGameOver = false;
      this.isPaused = false;
      this.score = 0;
      this.depth = 0;
      this.upgradeLevel = 1;
      this.xp = 0;
      this.xpToNextLevel = 100;
      
      // Reset boss fight state
      this.isBossFight = false;
      this.bossFightTimer = 0;
      this.arenaBounds = null;
      this.kraken = null;
      this.trenchX = null;
      
      // Reset minigame state
      this.isMinigameActive = false;
      this.minigameCursor = 0;
      this.minigameDirection = 1;
      this.minigameShowingReward = false;
      this.minigameLastCursor = 0;
      
      // Reset camera
      this.cameraShake.x = 0;
      this.cameraShake.y = 0;
      this.shakeIntensity = 0;
      
      // Clear all entities
      this.enemies = [];
      this.projectiles = [];
      this.xpOrbs = [];
      this.depthCharges = [];
      this.explosions = [];
      this.treasureChests = [];
      this.obstacles = [];
      this.healthPacks = [];
      this.sonarPulses = [];
      
      // Reset upgrade manager (clears all upgrades) - do this BEFORE creating new player
      this.upgradeManager.playerUpgrades.clear();
      
      // Reset player - create new instance
      this.player = new Player(this, 0, 75);
      
      // Explicitly reset all player properties to ensure clean state
      this.player.hp = 100;
      this.player.maxHp = 100;
      this.player.position.x = 0;
      this.player.position.y = 75;
      this.player.velocity.x = 0;
      this.player.velocity.y = 0;
      this.player.damage = 10;
      this.player.speed = 250;
      this.player.radius = 15;
      this.player.multiShotLevel = 0;
      this.player.magnetRadius = 100;
      this.player.pierceCount = 0;
      this.player.explosionRadius = 0;
      this.player.homingStrength = 0;
      this.player.projectileSpeedMult = 1.0;
      this.player.projectileRangeMult = 1.0;
      this.player.projectileSizeMult = 1.0;
      this.player.critChance = 0;
      this.player.vampireHeal = 0;
      this.player.damageReduction = 0;
      this.player.deepPressure = false;
      this.player.scavengerChance = 0;
      this.player.xpMultiplier = 1.0;
      this.player.scatterLevel = 0;
      this.player.rearGunsLevel = 0;
      this.player.knockbackStrength = 0;
      this.player.freezeChance = 0;
      this.player.giantTorpedoLevel = 0;
      this.player.shotsFired = 0;
      this.player.plasmaFieldLevel = 0;
      this.player.depthChargeLevel = 0;
      this.player.sonarPulseLevel = 0;
      this.player.shootCooldown = 0;
      this.player.attackInterval = 0.5;
      this.player.depthChargeTimer = 0;
      this.player.plasmaTimer = 0;
      this.player.plasmaPulseTimer = 0;
      this.player.sonarPulseTimer = 0;
      this.player.damageFlashTimer = 0;
      this.player.propellerRotation = 0;
      this.player.vampireCounter = 0;
      this.player.spawnBobTimer = 0;
      this.player.spawnTargetY = 75;
      this.player.spawnBobComplete = false;
      this.player.bubbles = [];
      this.player.bubbleSpawnTimer = 0;
      this.player.isInvulnerable = false;
      
      // Initialize camera to center on player
      this.camera.x = this.player.position.x - this.canvas.width / 2;
      this.camera.y = this.player.position.y - this.canvas.height / 2;
      
      // Ensure camera doesn't show too much sky (clamp top)
      const minCamY = -0.15 * this.canvas.height;
      if (this.camera.y < minCamY) {
          this.camera.y = minCamY;
      }
      
      // Reset seen upgrades
      this.seenUpgrades.clear();
      
      // Reset stats tracking
      this.totalDamageDealt = 0;
      this.enemyKills.clear();
      
      // Reset timers
      this.lastTime = performance.now();
      this.gameStartTime = performance.now();
      
      // Reset UI elements visibility
      const depthMeter = document.getElementById('depth-meter-container');
      if (depthMeter) depthMeter.style.display = 'block'; // Show depth meter
      
      const bossHpBar = document.getElementById('boss-hp-bar-container');
      if (bossHpBar) bossHpBar.style.display = 'none'; // Hide boss HP bar
      
      const bossPhaseIndicator = document.getElementById('boss-phase-indicator');
      if (bossPhaseIndicator) bossPhaseIndicator.style.display = 'none'; // Hide boss phase indicator
      
      // Close any open menus
      const escMenu = document.getElementById('esc-menu');
      if (escMenu) escMenu.style.display = 'none';
      const settingsMenu = document.getElementById('settings-menu');
      if (settingsMenu) settingsMenu.style.display = 'none';
      const upgradeMenu = document.getElementById('upgrade-menu');
      if (upgradeMenu) upgradeMenu.style.display = 'none';
      
      // Play water splash sound
      this.soundManager.playWaterSplash();
      
      // Start ambient background music loop
      const ambientVolume = this.soundManager.getAmbientSoundEnabled() ? 0.15 : 0;
      this.soundManager.playAmbientLoop(ambientVolume);
      
      // Start game loop
      requestAnimationFrame(this.loop.bind(this));
  }
  
  setupStartScreen() {
      const startScreen = document.getElementById('start-screen');
      const startBtn = document.getElementById('start-btn');
      
      if (!startScreen || !startBtn) return;
      
      startBtn.onclick = () => {
          startScreen.style.display = 'none';
          this.start();
          this.soundManager.playUIClick();
      };
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
    this.gameStartTime = performance.now();
    
    // Initialize camera to center on player
    this.camera.x = this.player.position.x - this.canvas.width / 2;
    this.camera.y = this.player.position.y - this.canvas.height / 2;
    
    // Ensure camera doesn't show too much sky (clamp top)
    const minCamY = -0.15 * this.canvas.height;
    if (this.camera.y < minCamY) {
        this.camera.y = minCamY;
    }
    
    // Unpause the game
    this.isPaused = false;
    
    // Play water splash sound when game starts
    this.soundManager.playWaterSplash();
    // Start ambient background music loop (volume will be set based on settings)
    const ambientVolume = this.soundManager.getAmbientSoundEnabled() ? 0.15 : 0;
    this.soundManager.playAmbientLoop(ambientVolume);
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
        
        // Check for bounces and play alternating metronome sounds
        if (this.minigameCursor >= 1) {
            this.minigameCursor = 1;
            if (this.minigameLastCursor < 1) {
                // Just hit the right side - play "tick"
                this.soundManager.playMinigameBounceLeft();
            }
            this.minigameDirection = -1;
        } else if (this.minigameCursor <= 0) {
            this.minigameCursor = 0;
            if (this.minigameLastCursor > 0) {
                // Just hit the left side - play "tock"
                this.soundManager.playMinigameBounceRight();
            }
            this.minigameDirection = 1;
        }
        
        this.minigameLastCursor = this.minigameCursor;
        
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
        
        // Update screen shake
        if (this.shakeIntensity > 0) {
            this.cameraShake.x = (Math.random() - 0.5) * this.shakeIntensity * 2;
            this.cameraShake.y = (Math.random() - 0.5) * this.shakeIntensity * 2;
            this.shakeIntensity *= 0.85; // Decay shake (slower decay = more visible)
            if (this.shakeIntensity < 0.05) {
                this.shakeIntensity = 0;
                this.cameraShake.x = 0;
                this.cameraShake.y = 0;
            }
        } else {
            this.cameraShake.x = 0;
            this.cameraShake.y = 0;
        }
        
        // Update camera to follow player during boss fight
        this.camera.x = this.player.position.x - this.canvas.width / 2 + this.cameraShake.x;
        this.camera.y = this.player.position.y - this.canvas.height / 2 + this.cameraShake.y;
        
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
        
        // Update Health Packs
        this.healthPacks.forEach(hp => hp.update(dt));
        this.healthPacks = this.healthPacks.filter(hp => hp.active);
        
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
    
    // Update screen shake
    if (this.shakeIntensity > 0) {
        this.cameraShake.x = (Math.random() - 0.5) * this.shakeIntensity * 2;
        this.cameraShake.y = (Math.random() - 0.5) * this.shakeIntensity * 2;
        this.shakeIntensity *= 0.85; // Decay shake (slower decay = more visible)
        if (this.shakeIntensity < 0.05) {
            this.shakeIntensity = 0;
            this.cameraShake.x = 0;
            this.cameraShake.y = 0;
        }
    } else {
        this.cameraShake.x = 0;
        this.cameraShake.y = 0;
    }
    
    this.camera.x = this.player.position.x - this.canvas.width / 2 + this.cameraShake.x;
    this.camera.y = targetCamY + this.cameraShake.y;

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
    
    // Update Health Packs
    this.healthPacks.forEach(hp => hp.update(dt));
    this.healthPacks = this.healthPacks.filter(hp => hp.active);
    
    // Update Sonar Pulses
    if (this.sonarPulses) {
        this.sonarPulses.forEach(pulse => {
            pulse.timeAlive += dt;
            const progress = pulse.timeAlive / pulse.lifetime;
            const oldRadius = pulse.radius;
            pulse.radius = pulse.maxRadius * progress;
            
            // Damage enemies when the pulse circle reaches them
            // Only check enemies that haven't been hit yet
            this.enemies.forEach(e => {
                if (pulse.hitEnemies.has(e)) return; // Already hit
                
                const dist = pulse.center.distanceTo(e.position);
                const enemyRadius = e.radius;
                
                // Check if enemy is currently within the pulse radius
                // Enemy is hit if pulse radius >= distance to enemy edge (dist - enemyRadius)
                // This catches enemies even if the pulse expands quickly and "skips over" them
                if (pulse.radius >= dist - enemyRadius) {
                    // Calculate damage based on distance (decreases with distance)
                    // Use the distance when pulse first reached the enemy (when it crossed the edge)
                    // If pulse already passed through, use the current distance
                    const hitDistance = oldRadius < dist - enemyRadius ? dist - enemyRadius : dist;
                    const normalizedDist = Math.min(hitDistance / pulse.maxRadius, 0.95); // Cap at 95% to ensure minimum damage
                    const damageMultiplier = Math.max(0.1, 1 - normalizedDist); // Ensure multiplier is at least 0.1
                    let damage = pulse.baseDamage * damageMultiplier;
                    
                    // At max level (level 7), ensure minimum damage is enough to kill guppies (5 HP)
                    // This prevents far-away enemies from taking too little damage
                    if (pulse.level >= 7) {
                        damage = Math.max(damage, 5); // Minimum 5 damage at max level
                    }
                    
                    if (damage > 0.1) {
                        e.takeDamage(damage);
                        pulse.hitEnemies.add(e);
                    }
                }
            });
            
            // Damage Kraken during boss fight
            if (this.isBossFight && this.kraken && !pulse.hitKraken) {
                const dist = pulse.center.distanceTo(this.kraken.position);
                const krakenRadius = this.kraken.radius;
                
                if (pulse.radius >= dist - krakenRadius && oldRadius < dist - krakenRadius) {
                    const damageMultiplier = 1 - (dist / pulse.maxRadius);
                    const damage = pulse.baseDamage * damageMultiplier;
                    if (damage > 0.1) {
                        this.kraken.takeDamage(damage);
                        pulse.hitKraken = true;
                    }
                }
            }
        });
        this.sonarPulses = this.sonarPulses.filter(p => p.timeAlive < p.lifetime);
    }
    
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
     // Spawn enemy completely off-screen using camera bounds
     // Calculate diagonal distance to ensure off-screen spawning in all directions
     const diagonalDist = Math.sqrt(this.canvas.width ** 2 + this.canvas.height ** 2) / 2;
     const minSpawnDist = diagonalDist + 100; // Add buffer to ensure completely off-screen
     
     // Try multiple angles to find a valid spawn position
     let spawnPos: Vector2 | null = null;
     let attempts = 0;
     const maxAttempts = 10;
     
     while (!spawnPos && attempts < maxAttempts) {
         attempts++;
         const angle = Math.random() * Math.PI * 2;
         const candidatePos = new Vector2(
            this.player.position.x + Math.cos(angle) * minSpawnDist,
            this.player.position.y + Math.sin(angle) * minSpawnDist
         );
         
         // Check if position is off-screen using camera bounds
         const screenLeft = this.camera.x;
         const screenRight = this.camera.x + this.canvas.width;
         const screenTop = this.camera.y;
         const screenBottom = this.camera.y + this.canvas.height;
         
         // Ensure spawn is completely outside viewport with buffer
         const buffer = 50;
         const isOffScreen = 
             candidatePos.x < screenLeft - buffer ||
             candidatePos.x > screenRight + buffer ||
             candidatePos.y < screenTop - buffer ||
             candidatePos.y > screenBottom + buffer;
         
         // Prevent spawning above surface
         if (isOffScreen && candidatePos.y >= 50) {
             spawnPos = candidatePos;
         }
     }
     
     // If we couldn't find a valid position after attempts, use a safe fallback
     if (!spawnPos) {
         // Spawn far to the right of the screen as fallback
         spawnPos = new Vector2(
             this.camera.x + this.canvas.width + 200,
             Math.max(50, this.player.position.y + (Math.random() - 0.5) * this.canvas.height)
         );
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
      this.minigameLastCursor = 0;
      
      // Check which upgrades are maxed and adjust zones accordingly
      this.updateMinigameZones();
      
      this.soundManager.playMinigameStart();
  }
  
  updateMinigameZones() {
      const gaugeEl = document.getElementById('minigame-gauge');
      if (!gaugeEl) return;
      
      // Check if all legendary upgrades are maxed
      const allLegendaryMaxed = this.upgradeManager.upgrades
          .filter(u => u.rarity === 'legendary')
          .every(u => {
              const playerUpgrade = this.upgradeManager.playerUpgrades.get(u.id);
              return !u.maxRank || (playerUpgrade && playerUpgrade.count >= u.maxRank);
          });
      
      // Check if all rare upgrades are maxed
      const allRareMaxed = this.upgradeManager.upgrades
          .filter(u => u.rarity === 'rare')
          .every(u => {
              const playerUpgrade = this.upgradeManager.playerUpgrades.get(u.id);
              return !u.maxRank || (playerUpgrade && playerUpgrade.count >= u.maxRank);
          });
      
      // Get zone elements
      const legendaryZone = gaugeEl.querySelector('.zone-legendary') as HTMLElement;
      const rareLeftZone = gaugeEl.querySelector('.zone-rare-left') as HTMLElement;
      const rareRightZone = gaugeEl.querySelector('.zone-rare-right') as HTMLElement;
      
      if (allLegendaryMaxed && legendaryZone) {
          // Hide legendary zone and expand rare zones to fill the center
          legendaryZone.style.display = 'none';
          
          if (!allRareMaxed && rareLeftZone && rareRightZone) {
              // Expand rare zones to fill the legendary space without overlap
              // Original: left 44.75%-48.25% (3.5%), legendary 48.25%-51.75% (3.5%), right 51.75%-55.25% (3.5%)
              // New: left 44.75%-50% (5.25%), right 50%-55.25% (5.25%)
              rareLeftZone.style.width = '5.25%';
              rareLeftZone.style.left = '44.75%';
              rareRightZone.style.width = '5.25%';
              rareRightZone.style.left = '50%';
          }
      } else if (legendaryZone) {
          // Reset legendary zone to normal
          legendaryZone.style.display = 'block';
      }
      
      if (allRareMaxed) {
          // Hide rare zones entirely
          if (rareLeftZone) rareLeftZone.style.display = 'none';
          if (rareRightZone) rareRightZone.style.display = 'none';
      } else {
          // Show rare zones and reset to normal size if legendary is not maxed
          if (rareLeftZone) {
              rareLeftZone.style.display = 'block';
              if (!allLegendaryMaxed) {
                  rareLeftZone.style.width = '3.5%';
                  rareLeftZone.style.left = '44.75%';
              }
          }
          if (rareRightZone) {
              rareRightZone.style.display = 'block';
              if (!allLegendaryMaxed) {
                  rareRightZone.style.width = '3.5%';
                  rareRightZone.style.left = '51.75%';
              }
          }
      }
  }
  
  stopMinigame() {
      if (this.minigameShowingReward) return;
      this.minigameShowingReward = true;
      
      // Calculate Reward
      let rarity: 'common' | 'rare' | 'legendary' = 'common';
      
      // Check which zones are available
      const allLegendaryMaxed = this.upgradeManager.upgrades
          .filter(u => u.rarity === 'legendary')
          .every(u => {
              const playerUpgrade = this.upgradeManager.playerUpgrades.get(u.id);
              return !u.maxRank || (playerUpgrade && playerUpgrade.count >= u.maxRank);
          });
      
      const allRareMaxed = this.upgradeManager.upgrades
          .filter(u => u.rarity === 'rare')
          .every(u => {
              const playerUpgrade = this.upgradeManager.playerUpgrades.get(u.id);
              return !u.maxRank || (playerUpgrade && playerUpgrade.count >= u.maxRank);
          });
      
      // Determine zones based on what's available
      if (!allLegendaryMaxed) {
          // Normal zones: Rare at 0.4475-0.4825 (left) and 0.5175-0.5525 (right), Legendary at 0.4825-0.5175 (center)
          if (this.minigameCursor >= 0.4475 && this.minigameCursor <= 0.4825) rarity = 'rare'; // Left rare zone
          if (this.minigameCursor >= 0.5175 && this.minigameCursor <= 0.5525) rarity = 'rare'; // Right rare zone
          if (this.minigameCursor >= 0.4825 && this.minigameCursor <= 0.5175) rarity = 'legendary'; // Legendary takes priority
      } else if (!allRareMaxed) {
          // Legendary maxed, rare zones expanded: Left rare 0.4475-0.50, Right rare 0.50-0.5525
          if (this.minigameCursor >= 0.4475 && this.minigameCursor < 0.50) rarity = 'rare'; // Left expanded rare zone
          if (this.minigameCursor >= 0.50 && this.minigameCursor <= 0.5525) rarity = 'rare'; // Right expanded rare zone
      }
      // If both are maxed, rarity stays 'common'
      
      // Play chest open sound with correct rarity
      this.soundManager.playChestOpen(rarity);
      
      // Filter out upgrades that have reached max rank
      const upgrades = this.upgradeManager.upgrades.filter(u => {
        if (u.rarity !== rarity) return false;
        const playerUpgrade = this.upgradeManager.playerUpgrades.get(u.id);
        if (playerUpgrade && u.maxRank) {
          return playerUpgrade.count < u.maxRank;
        }
        return true;
      });
      
      let availableUpgrades = upgrades;
      
      // Safety check: if rare/legendary and all upgrades of that rarity are maxed,
      // give a random upgrade the player doesn't have instead
      if ((rarity === 'rare' || rarity === 'legendary') && upgrades.length === 0) {
        const upgradesNotOwned = this.upgradeManager.upgrades.filter(u => {
          // Only return upgrades the player doesn't have at all
          return !this.upgradeManager.playerUpgrades.has(u.id);
        });
        
        if (upgradesNotOwned.length > 0) {
          availableUpgrades = upgradesNotOwned;
        } else {
          // Fallback: any upgrade that hasn't reached max rank
          availableUpgrades = this.upgradeManager.upgrades.filter(u => {
            const playerUpgrade = this.upgradeManager.playerUpgrades.get(u.id);
            if (playerUpgrade && u.maxRank) {
              return playerUpgrade.count < u.maxRank;
            }
            return true;
          });
        }
      } else if (upgrades.length === 0) {
        // If no upgrades available for this rarity (common), try any rarity
        availableUpgrades = this.upgradeManager.upgrades.filter(u => {
          const playerUpgrade = this.upgradeManager.playerUpgrades.get(u.id);
          if (playerUpgrade && u.maxRank) {
            return playerUpgrade.count < u.maxRank;
          }
          return true;
        });
      }
      
      const pick = availableUpgrades[Math.floor(Math.random() * availableUpgrades.length)];
      
      if (pick) {
          // Mark this upgrade as seen
          this.seenUpgrades.add(pick.id);
          
          // Update rarity to match the actual upgrade given (in case we fell back to a different rarity)
          const actualRarity = pick.rarity;
          
          this.upgradeManager.applyUpgrade(pick);
          this.soundManager.playPowerup();
          
          // Show UI
          const rewardEl = document.getElementById('minigame-reward');
          const contentEl = document.getElementById('reward-content');
          if (rewardEl && contentEl) {
              rewardEl.style.display = 'block';
              contentEl.innerHTML = `
                  <div class="upgrade-icon" style="font-size: 48px;">${pick.icon}</div>
                  <h3 style="margin:0; color: ${actualRarity === 'legendary' ? '#ff9800' : actualRarity === 'rare' ? '#9c27b0' : '#4caf50'}">${pick.name}</h3>
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
      
      this.soundManager.playBossFightEntry();
  }
  
  spawnBossObstacles(centerX: number, centerY: number, arenaSize: number) {
      // Spawn floating coral obstacles around the arena
      // One coral per grid cell
      const CORAL_GRID_SIZE = 450; // Size of each grid cell in pixels (easily editable)
      const coralColors = 6; // Number of coral colors available
      
      // Calculate arena bounds
      const arenaMinX = centerX - arenaSize / 2;
      const arenaMinY = centerY - arenaSize / 2;
      
      // Calculate number of grid cells in each dimension
      const gridCellsX = Math.floor(arenaSize / CORAL_GRID_SIZE);
      const gridCellsY = Math.floor(arenaSize / CORAL_GRID_SIZE);
      
      // Spawn one coral per grid cell
      for (let gridX = 0; gridX < gridCellsX; gridX++) {
          for (let gridY = 0; gridY < gridCellsY; gridY++) {
              // Calculate the bounds of this grid cell
              const cellMinX = arenaMinX + gridX * CORAL_GRID_SIZE;
              const cellMinY = arenaMinY + gridY * CORAL_GRID_SIZE;
              
              // Spawn coral at random position within this grid cell
              // Leave some margin to avoid spawning at exact edges
              const margin = 20;
              const x = cellMinX + margin + Math.random() * (CORAL_GRID_SIZE - margin * 2);
              const y = cellMinY + margin + Math.random() * (CORAL_GRID_SIZE - margin * 2);
              const radius = 30 + Math.random() * 20; // 30-50 pixels
              
              // Assign color using checkerboard-like pattern with variation for better alternation
              // Use grid position to create alternating pattern, but add some randomness
              const baseColor = (gridX + gridY) % coralColors;
              const colorVariation = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
              const colorIndex = (baseColor + colorVariation + coralColors) % coralColors;
              
              this.obstacles.push(new Obstacle(this, x, y, radius, 'coral', colorIndex));
          }
      }
  }
  
  winGame() {
      this.isGameOver = true;
      this.soundManager.playVictory();
      // Show Victory Screen
      const deathScreen = document.getElementById('death-screen');
      if (deathScreen) {
          deathScreen.style.display = 'flex';
          const h1 = deathScreen.querySelector('h1');
          if (h1) h1.innerText = "YOU CONQUERED THE ABYSS!";
          
          // Hide default death screen stats (they're for regular death, not victory)
          const deathLevel = document.getElementById('death-level');
          const deathLevelValue = document.getElementById('death-level-value');
          const deathScore = document.getElementById('death-score');
          if (deathLevel) deathLevel.parentElement!.style.display = 'none';
          if (deathLevelValue) deathLevelValue.parentElement!.style.display = 'none';
          if (deathScore) deathScore.parentElement!.style.display = 'none';
          
          // Remove existing victory stats if any (to prevent duplicates)
          const existingStats = deathScreen.querySelector('.victory-stats');
          if (existingStats) {
              existingStats.remove();
          }
          
          // Format time helper
          const formatTime = (seconds: number): string => {
              const mins = Math.floor(seconds / 60);
              const secs = Math.floor(seconds % 60);
              return `${mins}:${secs.toString().padStart(2, '0')}`;
          };
          
          // Format number with commas
          const formatNumber = (num: number): string => {
              return num.toLocaleString();
          };
          
          // Calculate time played
          const totalTimeSeconds = (performance.now() - this.gameStartTime) / 1000;
          
          // Get enemy kill counts
          const monsterNames: Record<string, string> = {
              'fish_small': 'Guppy',
              'fish_medium': 'Piranha',
              'crab': 'Armored Crab',
              'eel': 'Electric Eel',
              'angler': 'Angler Fish',
              'squid': 'Giant Squid',
              'shark': 'Great White',
              'turtle': 'Ancient Turtle',
              'ray': 'Manta Ray',
              'abyss_horror': 'Abyss Horror'
          };
          
          // Build enemy kills list with dynamic columns (5 per column)
          let enemyKillsHTML = '';
          const sortedKills = Array.from(this.enemyKills.entries())
              .filter(([_, count]) => count > 0)
              .sort((a, b) => b[1] - a[1]); // Sort by count descending
          
          if (sortedKills.length > 0) {
              const enemiesPerColumn = 5;
              const numColumns = Math.ceil(sortedKills.length / enemiesPerColumn);
              
              enemyKillsHTML = '<div class="enemy-kills-column"><h3>Enemies Defeated</h3><div class="enemy-kills-grid">';
              
              // Create columns dynamically
              for (let col = 0; col < numColumns; col++) {
                  const startIdx = col * enemiesPerColumn;
                  const endIdx = Math.min(startIdx + enemiesPerColumn, sortedKills.length);
                  const columnKills = sortedKills.slice(startIdx, endIdx);
                  
                  enemyKillsHTML += '<div class="enemy-kills-subcolumn">';
                  columnKills.forEach(([id, count]) => {
                      const name = monsterNames[id] || id;
                      enemyKillsHTML += `<p class="death-stat enemy-stat">${name}: <span>${formatNumber(count)}</span></p>`;
                  });
                  enemyKillsHTML += '</div>';
              }
              
              enemyKillsHTML += '</div></div>';
          }
          
          // Add stats with two-column layout
          const stats = document.createElement('div');
          stats.className = 'victory-stats';
          stats.innerHTML = `
            <div class="stats-column">
              <h3>Game Stats</h3>
              <p class="death-stat game-stat">Time Played: <span>${formatTime(totalTimeSeconds)}</span></p>
              <p class="death-stat game-stat">Boss Fight Duration: <span>${formatTime(this.bossFightTimer)}</span></p>
              <p class="death-stat game-stat">Final Score: <span>${formatNumber(this.score)}</span></p>
              <p class="death-stat game-stat">Final Level: <span>${this.upgradeLevel}</span></p>
              <p class="death-stat game-stat">Total Damage Dealt: <span>${formatNumber(Math.floor(this.totalDamageDealt))}</span></p>
            </div>
            ${enemyKillsHTML}
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
                     this.onEnemyHit(enemy);
                 }
             }
          }
          
          // Player vs XP Orbs (boss fight)
          for (const orb of this.xpOrbs) {
              if (orb.position.distanceTo(this.player.position) < (orb.radius + this.player.radius)) {
                  this.collectXP(orb.value);
                  orb.active = false;
                  this.soundManager.playXPCollect();
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
              
              if (obstacle.type === 'tentacle_barrier' || obstacle.type === 'coral') {
                  // Check collision with tentacle/coral line segments
                  const time = performance.now() / (obstacle.type === 'coral' ? 800 : 500);
                  let collided = false;
                  const armCount = obstacle.type === 'coral' ? obstacle.armCount : 4;
                  
                  for(let i=0; i<armCount; i++) {
                      const angle = (Math.PI * 2 / armCount) * i + Math.sin(time + i) * (obstacle.type === 'coral' ? 0.2 : 0.3);
                      const armLength = obstacle.type === 'coral' 
                          ? obstacle.radius * 4 * (0.8 + (i % 3) * 0.15) // Quadrupled arm length (doubled again)
                          : obstacle.radius;
                      const endX = obstacle.position.x + Math.cos(angle) * armLength;
                      const endY = obstacle.position.y + Math.sin(angle) * armLength;
                      
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
                      const armWidth = obstacle.type === 'coral' ? 4 : 15; // Thinner arms for coral
                      
                      if (distToLine < this.player.radius + armWidth) {
                          // Push player away from tentacle/coral
                          const pushDir = playerPos.sub(closestPoint).normalize();
                          if (pushDir.length() > 0) {
                              const overlap = (this.player.radius + armWidth) - distToLine;
                              this.player.position = this.player.position.add(pushDir.scale(overlap + 2));
                          }
                          collided = true;
                      }
                  }
                  
                  // Also check collision with center body for coral
                  if (obstacle.type === 'coral') {
                      const distToCenter = this.player.position.distanceTo(obstacle.position);
                      const centerRadius = obstacle.radius * 0.4;
                      if (distToCenter < this.player.radius + centerRadius) {
                          const pushDir = this.player.position.sub(obstacle.position).normalize();
                          if (pushDir.length() > 0) {
                              const overlap = (this.player.radius + centerRadius) - distToCenter;
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
              this.soundManager.playXPCollect();
          }
      }
  }
  
  onEnemyHit(enemy: Enemy) {
      // Track damage dealt
      if (enemy.hp > 0) {
          // Damage is dealt before hp check, so we track it here
          // We'll track it in takeDamage instead for accuracy
      }
      
      if (enemy.hp <= 0) {
          // Track enemy kill by type
          const enemyType = enemy.stats.id || 'unknown';
          const currentKills = this.enemyKills.get(enemyType) || 0;
          this.enemyKills.set(enemyType, currentKills + 1);
          
          this.soundManager.playEnemyDeath();
          // Check scavenger protocol - drop health pack
          if (this.player.scavengerChance > 0) {
              const roll = Math.random();
              if (roll < this.player.scavengerChance) {
                  // Spawn a health pack at enemy position
                  this.healthPacks.push(new HealthPack(this, enemy.position.x, enemy.position.y));
              }
          }
          
          this.player.onEnemyKilled();
      }
  }

  collectXP(amount: number) {
      // Apply XP multiplier
      const multipliedAmount = amount * this.player.xpMultiplier;
      this.xp += multipliedAmount;
      if (this.xp >= this.xpToNextLevel && !this.disableLevelUp) {
          this.levelUp();
      }
  }

  levelUp() {
      this.upgradeLevel++;
      this.xp -= this.xpToNextLevel;
      this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.2);
      this.soundManager.playLevelUp();
      this.showUpgradeMenu();
  }

  showUpgradeMenu() {
      const menu = document.getElementById('upgrade-menu');
      const optionsContainer = document.getElementById('upgrade-options');
      if (!menu || !optionsContainer) return;

      const options = this.upgradeManager.getRandomUpgrades(5, this.depth, this.upgradeLevel);

      // Safety check: if no upgrades are available, skip the level up screen
      if (options.length === 0) {
          // No upgrades available, just continue the game
          this.updateUI();
          return;
      }

      // Mark all shown upgrades as seen
      options.forEach(opt => {
          this.seenUpgrades.add(opt.id);
      });

      this.isPaused = true;
      menu.style.display = 'flex';
      optionsContainer.innerHTML = '';

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
              this.soundManager.playUIClick();
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
      if (scoreEl) scoreEl.innerText = this.upgradeLevel.toString();
      
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
              const isMaxed = item.def.maxRank && item.count >= item.def.maxRank;
              el.className = isMaxed ? 'inv-item maxed' : 'inv-item';
              el.title = `${item.def.name} (Rank ${item.count}${isMaxed ? ' - MAX' : ''})`;
              el.innerHTML = `
                <div class="inv-icon">${item.def.icon}</div>
                <div class="inv-rank">${item.count}</div>
                ${isMaxed ? '<div class="inv-max-tag">MAX</div>' : ''}
              `;
              inventoryEl.appendChild(el);
          });
      }
  }
  
  gameOver() {
      this.isGameOver = true;
      this.soundManager.playDeath();
      const deathScreen = document.getElementById('death-screen');
      if (deathScreen) {
          deathScreen.style.display = 'flex';
          const h1 = deathScreen.querySelector('h1');
          if (h1) h1.innerText = "Your sub imploded!";
          
          // Show default death screen stats and hide victory stats
          const deathLevel = document.getElementById('death-level');
          const deathLevelValue = document.getElementById('death-level-value');
          const deathScore = document.getElementById('death-score');
          if (deathLevel) {
              deathLevel.innerText = `${this.depth}m`;
              deathLevel.parentElement!.style.display = 'block';
          }
          if (deathLevelValue) {
              deathLevelValue.innerText = this.upgradeLevel.toString();
              deathLevelValue.parentElement!.style.display = 'block';
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
    this.healthPacks.forEach(hp => hp.draw(this.ctx));
    this.depthCharges.forEach(d => d.draw(this.ctx));
    this.explosions.forEach(e => e.draw(this.ctx));
    
    // Draw Sonar Pulses
    if (this.sonarPulses) {
        this.sonarPulses.forEach(pulse => {
            const progress = pulse.timeAlive / pulse.lifetime;
            const alpha = (1 - progress) * 0.4; // Fade out as it expands
            
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.strokeStyle = '#00ffff';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(pulse.center.x, pulse.center.y, pulse.radius, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Inner glow
            this.ctx.globalAlpha = alpha * 0.5;
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
            
            this.ctx.restore();
        });
    }
    
    // Draw obstacles (boss fight only) - draw BEFORE enemies/kraken so they appear behind
    if (this.isBossFight) {
        this.obstacles.forEach(obs => obs.draw(this.ctx));
    }
    
    this.enemies.forEach(e => e.draw(this.ctx));
    if (this.kraken && this.isBossFight) this.kraken.draw(this.ctx);
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
