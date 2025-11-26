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

  getRandomUpgrades(count: number = 5, depth: number = 0, level: number = 1): UpgradeDef[] {
    const result: UpgradeDef[] = [];
    
    // Check if all common upgrades are at max rank
    const allCommonUpgrades = this.upgrades.filter(u => u.rarity === 'common');
    const allCommonsMaxed = allCommonUpgrades.every(u => {
      const playerUpgrade = this.playerUpgrades.get(u.id);
      // If upgrade has maxRank, check if it's reached
      if (u.maxRank) {
        if (playerUpgrade) {
          return playerUpgrade.count >= u.maxRank;
        }
        return false; // Not acquired yet, so not maxed
      }
      // If no maxRank, consider it as "always available" (shouldn't happen but safety check)
      return false;
    });
    
    // Level restriction: only common upgrades if level <= 3
    const onlyCommonUpgrades = level <= 3;
    
    // Track how many rare/legendary upgrades we've selected
    let rareLegendaryCount = 0;
    let legendaryCount = 0;
    const maxRareLegendary = allCommonsMaxed ? count : (depth > 250 ? 1 : 1); // Guarantee at least 1 if depth > 250
    
    // Depth-based guarantees (disabled if level <= 3)
    const guaranteeRareOrLegendary = !onlyCommonUpgrades && depth > 250; // At least one purple or orange if depth > 250m
    // Level-based guarantee: at least one rare if level >= 7
    const guaranteeRareFromLevel = level >= 7;
    // Special case: guarantee legendary ONLY when hitting level 13 exactly
    const guaranteeLegendaryFromLevel = level === 13;
    // Special case: guarantee Multi Shot at level 20 if player doesn't have it
    const playerHasMultiShot = this.playerUpgrades.get('multi_shot');
    const guaranteeMultiShotAtLevel20 = level === 20 && (!playerHasMultiShot || playerHasMultiShot.count === 0);
    // Special case: guarantee legendary on EVEN level ups if depth >= 500m
    const guaranteeLegendaryOnEvenLevels = !onlyCommonUpgrades && depth >= 500 && level % 2 === 0;
    // Legendary upgrades only available at 250 meters or deeper (and level > 3), OR if level === 13, OR if guaranteeing Multi Shot at level 20, OR if depth >= 500m on even levels
    const allowLegendary = !onlyCommonUpgrades && (depth >= 250 || guaranteeLegendaryFromLevel || guaranteeMultiShotAtLevel20 || guaranteeLegendaryOnEvenLevels);
    const guaranteeLegendary = (depth > 750 && allowLegendary) || guaranteeLegendaryFromLevel || guaranteeMultiShotAtLevel20 || guaranteeLegendaryOnEvenLevels; // At least one orange if depth > 750m AND at least 250m deep, OR if level === 13, OR if guaranteeing Multi Shot at level 20, OR if depth >= 500m on even levels
    
    while (result.length < count) {
      const rand = Math.random();
      let rarity = 'common';
      
      // If level <= 3, force common only
      if (onlyCommonUpgrades) {
        rarity = 'common';
      } else {
        // Force rare/legendary if we need to guarantee one
        if (guaranteeLegendary && legendaryCount === 0 && result.length === count - 1 && allowLegendary) {
          rarity = 'legendary'; // Force legendary on last slot if needed
        } else if ((guaranteeRareOrLegendary || guaranteeRareFromLevel) && rareLegendaryCount === 0 && result.length === count - 1) {
          // Force rare on last slot if we haven't gotten one yet (no legendary if depth < 250)
          rarity = 'rare';
        } else if (rareLegendaryCount < maxRareLegendary) {
          // Normal random selection
          if (rand > 0.95 && allowLegendary) rarity = 'legendary';
          else if (rand > 0.70) rarity = 'rare';
        }
      }

      // Filter out upgrades that have reached max rank
      const candidates = this.upgrades.filter(u => {
        if (u.rarity !== rarity) return false;
        
        // Level restrictions: Cryo Rounds only available at level 10+
        if (u.id === 'cryo_rounds' && level < 10) return false;
        
        // Depth restrictions: Deep Pressure only available at depth >= 500m
        if (u.id === 'deep_pressure' && depth < 500) return false;
        
        // Check if upgrade has reached max rank
        const playerUpgrade = this.playerUpgrades.get(u.id);
        if (playerUpgrade && u.maxRank) {
          return playerUpgrade.count < u.maxRank;
        }
        
        return true; // No max rank or not yet acquired
      });
      
      if (candidates.length === 0) {
        // If no candidates for this rarity, try any available rarity
        // But respect the rare/legendary limit
        const allCandidates = this.upgrades.filter(u => {
          // Skip rare/legendary if we've hit the limit
          if ((u.rarity === 'rare' || u.rarity === 'legendary') && rareLegendaryCount >= maxRareLegendary) {
            return false;
          }
          // Don't allow legendary upgrades if depth < 250 meters (unless level >= 13)
          if (u.rarity === 'legendary' && !allowLegendary) {
            return false;
          }
          
          // Level restrictions: Cryo Rounds only available at level 10+
          if (u.id === 'cryo_rounds' && level < 10) return false;
          
          // Depth restrictions: Deep Pressure only available at depth >= 500m
          if (u.id === 'deep_pressure' && depth < 500) return false;
          
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
          if (pick.rarity === 'rare' || pick.rarity === 'legendary') {
            rareLegendaryCount++;
          }
          if (pick.rarity === 'legendary') {
            legendaryCount++;
          }
        }
        continue;
      }

      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      
      if (!result.includes(pick)) {
        result.push(pick);
        if (pick.rarity === 'rare' || pick.rarity === 'legendary') {
          rareLegendaryCount++;
        }
        if (pick.rarity === 'legendary') {
          legendaryCount++;
        }
      }
    }
    
    // Final check: ensure guarantees are met
    // First, check if we need to guarantee legendary on even levels at depth >= 500m
    if (guaranteeLegendaryOnEvenLevels && legendaryCount === 0) {
      // Replace a random non-legendary upgrade with a legendary
      const legendaryCandidates = this.upgrades.filter(u => {
        if (u.rarity !== 'legendary') return false;
        // Don't force Multi Shot here if we're also guaranteeing it at level 20
        if (guaranteeMultiShotAtLevel20 && u.id === 'multi_shot') return false;
        const playerUpgrade = this.playerUpgrades.get(u.id);
        if (playerUpgrade && u.maxRank) {
          return playerUpgrade.count < u.maxRank;
        }
        return true;
      });
      
      if (legendaryCandidates.length > 0) {
        const legendaryPick = legendaryCandidates[Math.floor(Math.random() * legendaryCandidates.length)];
        // Replace first non-legendary if we have one
        const replaceIndex = result.findIndex(u => u.rarity !== 'legendary');
        if (replaceIndex >= 0 && !result.includes(legendaryPick)) {
          if (result[replaceIndex].rarity === 'rare' || result[replaceIndex].rarity === 'legendary') {
            rareLegendaryCount--; // Adjust count
          }
          result[replaceIndex] = legendaryPick;
          legendaryCount++;
          rareLegendaryCount++;
        }
      }
    }
    
    // Then check if we need to guarantee Multi Shot at level 20
    if (guaranteeMultiShotAtLevel20) {
      const multiShotUpgrade = this.upgrades.find(u => u.id === 'multi_shot');
      if (multiShotUpgrade && !result.includes(multiShotUpgrade)) {
        // Check if Multi Shot is available (not maxed)
        const playerUpgrade = this.playerUpgrades.get('multi_shot');
        const isAvailable = !playerUpgrade || !multiShotUpgrade.maxRank || playerUpgrade.count < multiShotUpgrade.maxRank;
        
        if (isAvailable) {
          // Replace a random upgrade with Multi Shot
          const replaceIndex = result.findIndex(u => u.id !== 'multi_shot');
          if (replaceIndex >= 0) {
            // Adjust counts if replacing a rare/legendary
            if (result[replaceIndex].rarity === 'rare' || result[replaceIndex].rarity === 'legendary') {
              rareLegendaryCount--;
            }
            if (result[replaceIndex].rarity === 'legendary') {
              legendaryCount--;
            }
            // Add Multi Shot
            result[replaceIndex] = multiShotUpgrade;
            legendaryCount++;
            rareLegendaryCount++;
          }
        }
      }
    }
    
    if (guaranteeLegendary && legendaryCount === 0 && !guaranteeMultiShotAtLevel20 && !guaranteeLegendaryOnEvenLevels) {
      // Replace a random non-legendary upgrade with a legendary
      const legendaryCandidates = this.upgrades.filter(u => {
        if (u.rarity !== 'legendary') return false;
        // Don't force Multi Shot here if we already handled it above
        if (guaranteeMultiShotAtLevel20 && u.id === 'multi_shot') return false;
        const playerUpgrade = this.playerUpgrades.get(u.id);
        if (playerUpgrade && u.maxRank) {
          return playerUpgrade.count < u.maxRank;
        }
        return true;
      });
      
      if (legendaryCandidates.length > 0) {
        const legendaryPick = legendaryCandidates[Math.floor(Math.random() * legendaryCandidates.length)];
        // Replace first non-legendary if we have one
        const replaceIndex = result.findIndex(u => u.rarity !== 'legendary');
        if (replaceIndex >= 0 && !result.includes(legendaryPick)) {
          if (result[replaceIndex].rarity === 'rare' || result[replaceIndex].rarity === 'legendary') {
            rareLegendaryCount--; // Adjust count
          }
          result[replaceIndex] = legendaryPick;
          legendaryCount++;
          rareLegendaryCount++;
        }
      }
    } else if ((guaranteeRareOrLegendary || guaranteeRareFromLevel) && rareLegendaryCount === 0) {
      // Replace a random common upgrade with a rare (no legendary if depth < 250)
      const rareLegendaryCandidates = this.upgrades.filter(u => {
        if (u.rarity !== 'rare' && u.rarity !== 'legendary') return false;
        // Don't allow legendary upgrades if depth < 250 meters
        if (u.rarity === 'legendary' && !allowLegendary) return false;
        // For level-based guarantee, prefer rare over legendary
        if (guaranteeRareFromLevel && u.rarity === 'legendary') return false;
        // Level restrictions: Cryo Rounds only available at level 10+
        if (u.id === 'cryo_rounds' && level < 10) return false;
        // Depth restrictions: Deep Pressure only available at depth >= 500m
        if (u.id === 'deep_pressure' && depth < 500) return false;
        const playerUpgrade = this.playerUpgrades.get(u.id);
        if (playerUpgrade && u.maxRank) {
          return playerUpgrade.count < u.maxRank;
        }
        return true;
      });
      
      if (rareLegendaryCandidates.length > 0) {
        const rareLegendaryPick = rareLegendaryCandidates[Math.floor(Math.random() * rareLegendaryCandidates.length)];
        const replaceIndex = result.findIndex(u => u.rarity === 'common');
        if (replaceIndex >= 0 && !result.includes(rareLegendaryPick)) {
          result[replaceIndex] = rareLegendaryPick;
          rareLegendaryCount++;
          if (rareLegendaryPick.rarity === 'legendary') {
            legendaryCount++;
          }
        }
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
        // For 'add' operation, ensure we're adding the value correctly
        const currentValue = p[upgrade.stat] || 0;
        p[upgrade.stat] = currentValue + upgrade.value!;
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
                  const orbitProj = new OrbitProjectile(this.game, angle);
                  this.game.projectiles.push(orbitProj);
              }
              break;
          case 'increment_pierce':
              p.pierceCount++;
              break;
          case 'increment_explosion':
              p.explosionRadius += 35; // Increased from 30 to 35 so rank 6 = 210 (same as old rank 7)
              break;
          case 'increment_homing':
              p.homingStrength += 0.5;
              break;
          case 'sniper_module':
              p.projectileSpeedMult += 0.25;
              p.projectileRangeMult += 0.25;
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
          case 'increment_knockback':
              p.knockbackStrength += 500; // Pixels per second impulse (+500 per rank)
              break;
          case 'unlock_freeze':
              p.freezeChance += 0.2; // +20% chance per rank
              break;
          case 'unlock_giant':
              p.giantTorpedoLevel++;
              break;
          case 'unlock_sonar_pulse':
              p.sonarPulseLevel++;
              break;
      }
  }
  }

  getInventory(): PlayerUpgrade[] {
      return Array.from(this.playerUpgrades.values());
  }
  
  reset() {
      this.playerUpgrades.clear();
      // Don't apply upgrades here - they will be applied when player is recreated
  }
}
