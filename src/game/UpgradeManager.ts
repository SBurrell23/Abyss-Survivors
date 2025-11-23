import { Game } from './Game';
import upgradesData from './data/upgrades.json';
import { OrbitProjectile } from './entities/OrbitProjectile';

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
    // Weighted random? Or just flat for now.
    // Let's implement simple rarity weights:
    // Common: 70%, Rare: 25%, Legendary: 5%
    // const pool: UpgradeDef[] = [];
    
    // Just pure random for now, but let's try to respect weights in generation
    const result: UpgradeDef[] = [];
    
    while (result.length < count) {
      const rand = Math.random();
      let rarity = 'common';
      if (rand > 0.95) rarity = 'legendary';
      else if (rand > 0.70) rarity = 'rare';

      const candidates = this.upgrades.filter(u => u.rarity === rarity);
      if (candidates.length === 0) continue; // Fallback if no legendary defined etc

      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      
      // Allow duplicates in list? Usually no.
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
      // Special case for HP to heal? or just max HP increase?
      // Usually max HP increase also heals amount or keeps percentage. 
      // For simplicity:
      if (upgrade.stat === 'maxHp') {
        p.hp += upgrade.value!;
      }
    } else if (upgrade.type === 'special') {
      if (upgrade.effect === 'increment_multishot') {
        this.game.player.multiShotLevel++;
      } else if (upgrade.effect === 'increment_protection_ring') {
         // Add a new orb
         const count = this.playerUpgrades.get(upgrade.id)!.count;
         // Add orbital
         // Calculate angle offset based on count or just add random/spaced?
         // Spacing them evenly requires re-adjusting all.
         // Simplest: Just add one at 0. Or better: remove all and re-add evenly.
         this.game.projectiles = this.game.projectiles.filter(p => !(p instanceof OrbitProjectile));
         for(let i=0; i<count; i++) {
             const angle = (Math.PI * 2 / count) * i;
             this.game.projectiles.push(new OrbitProjectile(this.game, angle));
         }
      }
    }
  }

  getInventory(): PlayerUpgrade[] {
      return Array.from(this.playerUpgrades.values());
  }
}

