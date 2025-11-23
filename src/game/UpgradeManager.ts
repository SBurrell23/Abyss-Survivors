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

  getRandomUpgrades(count: number = 3): UpgradeDef[] {
    const result: UpgradeDef[] = [];
    
    while (result.length < count) {
      const rand = Math.random();
      let rarity = 'common';
      if (rand > 0.95) rarity = 'legendary';
      else if (rand > 0.70) rarity = 'rare';

      const candidates = this.upgrades.filter(u => u.rarity === rarity);
      if (candidates.length === 0) continue; 

      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      
      if (!result.includes(pick)) {
        result.push(pick);
      }
    }
    return result;
  }

  applyUpgrade(upgrade: UpgradeDef) {
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
