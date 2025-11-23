import { Player } from './entities/Player';
import { Enemy, MonsterStats } from './entities/Enemy';
import { OrbitProjectile } from './entities/OrbitProjectile';
import { Projectile } from './entities/Projectile';
import { XPOrb } from './entities/XPOrb';
import { Vector2 } from './utils';
import { UpgradeManager } from './UpgradeManager';
import monstersData from './data/monsters.json';
import { SpriteFactory } from './graphics/SpriteFactory';

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  lastTime: number = 0;
  player: Player;
  input: { keys: Record<string, boolean> } = { keys: {} };
  
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  xpOrbs: XPOrb[] = [];
  
  upgradeManager: UpgradeManager;
  
  score: number = 0;
  level: number = 1;
  xp: number = 0;
  xpToNextLevel: number = 100;
  isPaused: boolean = false;
  isGameOver: boolean = false;

  // Camera
  camera: Vector2 = new Vector2(0, 0);

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false; // Important for pixel art
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.setupInput();

    this.setupRestart();

    this.player = new Player(this, 0, 0); // Start at 0,0 world coordinates
    this.upgradeManager = new UpgradeManager(this);
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
    this.ctx.imageSmoothingEnabled = false; // Reset on resize sometimes
  }

  setupInput() {
    window.addEventListener('keydown', (e) => {
      this.input.keys[e.key] = true;
    });
    window.addEventListener('keyup', (e) => {
      this.input.keys[e.key] = false;
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
    this.player.update(dt);

    // Update camera to follow player
    this.camera.x = this.player.position.x - this.canvas.width / 2;
    this.camera.y = this.player.position.y - this.canvas.height / 2;

    // Update enemies
    this.enemies.forEach(e => e.update(dt));
    this.enemies = this.enemies.filter(e => e.active);

    // Update projectiles
    this.projectiles.forEach(p => p.update(dt));
    this.projectiles = this.projectiles.filter(p => p.active);

    // Update XP Orbs
    this.xpOrbs.forEach(o => o.update(dt));
    this.xpOrbs = this.xpOrbs.filter(o => o.active);

    // Spawner logic (placeholder)
    if (Math.random() < 0.02) { // Simple random spawn
       this.spawnEnemy();
    }

    // Check Collisions
    this.checkCollisions();

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
     
     // Pick a random monster type based on weights (or just random for now)
     const monsters = monstersData as MonsterStats[];
     
     // Weighted spawn
     const totalWeight = monsters.reduce((sum, m) => sum + (m as any).weight || 10, 0);
     let rnd = Math.random() * totalWeight;
     
     let selectedMonster = monsters[0];
     for (const m of monsters) {
         const weight = (m as any).weight || 10;
         if (rnd < weight) {
             selectedMonster = m;
             break;
         }
         rnd -= weight;
     }

     this.enemies.push(new Enemy(this, spawnPos.x, spawnPos.y, selectedMonster));
  }

  checkCollisions() {
      // Player vs Enemies
      for (const enemy of this.enemies) {
          if (enemy.position.distanceTo(this.player.position) < (enemy.radius + this.player.radius)) {
              this.player.takeDamage(10 * 0.016); // Damage per frame approx
          }
      }

      // Projectiles vs Enemies
      for (const projectile of this.projectiles) {
          // Skip recovering orbit projectiles
          if (projectile instanceof OrbitProjectile && projectile.isRecovering) continue;

          for (const enemy of this.enemies) {
              if (projectile.position.distanceTo(enemy.position) < (projectile.radius + enemy.radius)) {
                  enemy.takeDamage(projectile.damage);
                  projectile.onHit(enemy);
                  break; // Next projectile
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

  collectXP(amount: number) {
      this.xp += amount;
      if (this.xp >= this.xpToNextLevel) {
          this.levelUp();
      }
  }

  levelUp() {
      this.level++;
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

      const options = this.upgradeManager.getRandomUpgrades(3);

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
      // Reset lastTime to avoid huge dt jump
      this.lastTime = performance.now();
      // Force UI update to show new inventory
      this.updateUI();
  }

  updateUI() {
      const scoreEl = document.getElementById('score');
      if (scoreEl) scoreEl.innerText = this.score.toString();
      
      const levelEl = document.getElementById('level');
      if (levelEl) levelEl.innerText = this.level.toString();

      const hpBar = document.getElementById('hp-bar');
      const hpText = document.getElementById('hp-text');
      if (hpBar && hpText) {
          const pct = (this.player.hp / this.player.maxHp) * 100;
          hpBar.style.width = `${Math.max(0, pct)}%`;
          hpText.innerText = `${Math.ceil(this.player.hp)} / ${this.player.maxHp}`;
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
          if (deathLevel) deathLevel.innerText = this.level.toString();
          if (deathScore) deathScore.innerText = this.score.toString();
      }
  }

  draw() {
    this.ctx.fillStyle = '#001e36'; // Deep ocean blue
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.translate(-this.camera.x, -this.camera.y);

    // Draw Grid/Background detail to show movement
    this.drawBackgroundGrid();

    this.xpOrbs.forEach(o => o.draw(this.ctx));
    this.enemies.forEach(e => e.draw(this.ctx));
    this.projectiles.forEach(p => p.draw(this.ctx));
    this.player.draw(this.ctx);

    this.ctx.restore();
  }

  drawBackgroundGrid() {
      const gridSize = 128; // Tile size (32 * 4 scale)
      
      // Create pattern if not exists
      if (!this.bgPattern) {
          this.bgPattern = SpriteFactory.createPattern('background_tile');
      }
      
      if (this.bgPattern) {
         this.ctx.save();
         // FillRect in world coordinates
         this.ctx.fillStyle = this.bgPattern;

         const viewL = this.camera.x;
         const viewT = this.camera.y;
         
         // Draw a bit extra to cover edges
         this.ctx.fillRect(viewL - gridSize, viewT - gridSize, this.canvas.width + gridSize * 2, this.canvas.height + gridSize * 2);
         
         this.ctx.restore();
      } else {
        // Fallback
        this.ctx.strokeStyle = '#003366';
        // ... old grid code
      }
  }
  
  bgPattern: CanvasPattern | null = null;
}

