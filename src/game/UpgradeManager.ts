import { Game } from './Game';
import upgradesData from './data/upgrades.json';
import { OrbitProjectile } from './entities/OrbitProjectile';
import { Projectile } from './entities/Projectile';

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'legendary';
  icon: string;
  type: 'stat' | 'special';
  stat?: string;
  value?: number;
  op?: 'add' | 'multiply';
  effect?: string;
  maxRank?: number;
}

export interface PlayerUpgrade {
  def: UpgradeDef;
  count: number;
}

export class UpgradeManager {
  game: Game;
  upgrades: UpgradeDef[];
  playerUpgrades: Map<string, PlayerUpgrade> = new Map();

  constructor(game: Game) {
    this.game = game;
    // Cast json data to UpgradeDef[]
    this.upgrades = upgradesData as unknown as UpgradeDef[];
  }

  getRandomUpgrades(count: number = 4): UpgradeDef[] {
    const result: UpgradeDef[] = [];
    
    while (result.length < count) {
      const rand = Math.random();
      let rarity = 'common';
      if (rand > 0.95) rarity = 'legendary';
      else if (rand > 0.70) rarity = 'rare';

      // Filter out upgrades that have reached max rank
      const candidates = this.upgrades.filter(u => {
        if (u.rarity !== rarity) return false;
        
        // Check if upgrade has reached max rank
        const playerUpgrade = this.playerUpgrades.get(u.id);
        if (playerUpgrade && u.maxRank) {
          return playerUpgrade.count < u.maxRank;
        }
        
        return true; // No max rank or not yet acquired
      });
      
      if (candidates.length === 0) {
        // If no candidates for this rarity, try any rarity
        const allCandidates = this.upgrades.filter(u => {
          const playerUpgrade = this.playerUpgrades.get(u.id);
          if (playerUpgrade && u.maxRank) {
            return playerUpgrade.count < u.maxRank;
          }
          return true;
        });
        
        if (allCandidates.length === 0) break; // No upgrades available
        
        const pick = allCandidates[Math.floor(Math.random() * allCandidates.length)];
        if (!result.includes(pick)) {
          result.push(pick);
        }
        continue;
      }

      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      
      if (!result.includes(pick)) {
        result.push(pick);
      }
    }
    return result;
  }

  applyUpgrade(upgrade: UpgradeDef) {
    // Check if upgrade has reached max rank
    const currentUpgrade = this.playerUpgrades.get(upgrade.id);
    if (currentUpgrade && upgrade.maxRank && currentUpgrade.count >= upgrade.maxRank) {
      // Already at max rank, don't apply
      return;
    }
    
    // Track it
    if (this.playerUpgrades.has(upgrade.id)) {
      this.playerUpgrades.get(upgrade.id)!.count++;
    } else {
      this.playerUpgrades.set(upgrade.id, { def: upgrade, count: 1 });
    }

    // Apply logic
    if (upgrade.type === 'stat' && upgrade.stat) {
      const p = this.game.player as any;
      if (upgrade.op === 'multiply') {
        p[upgrade.stat] *= upgrade.value!;
      } else {
        p[upgrade.stat] += upgrade.value!;
      }
      
      if (upgrade.stat === 'maxHp') {
        p.hp += upgrade.value!;
      }
    } else if (upgrade.type === 'special') {
      const p = this.game.player;
      switch (upgrade.effect) {
          case 'increment_multishot':
              p.multiShotLevel++;
              break;
          case 'increment_protection_ring':
              // Rebuild ring
              const count = this.playerUpgrades.get(upgrade.id)!.count;
              this.game.projectiles = this.game.projectiles.filter((proj: Projectile) => !(proj instanceof OrbitProjectile));
              for(let i=0; i<count; i++) {
                  const angle = (Math.PI * 2 / count) * i;
                  this.game.projectiles.push(new OrbitProjectile(this.game, angle));
              }
              break;
          case 'increment_pierce':
              p.pierceCount++;
              break;
          case 'increment_explosion':
              p.explosionRadius += 30;
              break;
          case 'increment_homing':
              p.homingStrength += 0.5;
              break;
          case 'sniper_module':
              p.projectileSpeedMult += 0.3;
              p.projectileRangeMult += 0.3;
              break;
          case 'unlock_depth_charge':
              p.depthChargeLevel++;
              break;
          case 'unlock_plasma':
              p.plasmaFieldLevel++;
              break;
          case 'unlock_vampire':
              p.vampireHeal++;
              break;
          case 'unlock_deep_pressure':
              p.deepPressure = true;
              break;
          case 'unlock_scatter':
              p.scatterLevel++;
              break;
          case 'unlock_rear_guns':
              p.rearGunsLevel++;
              break;
          case 'unlock_helix':
              p.helixEnabled = true;
              break;
          case 'increment_knockback':
              p.knockbackStrength += 100; // Pixels per second impulse
              break;
          case 'unlock_freeze':
              p.freezeChance += 0.1; // +10% chance
              break;
          case 'unlock_giant':
              p.giantTorpedoLevel++;
              break;
      }
    }
  }

  getInventory(): PlayerUpgrade[] {
      return Array.from(this.playerUpgrades.values());
  }
}
