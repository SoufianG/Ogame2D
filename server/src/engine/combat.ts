// Moteur de combat OGame cote serveur
// 6 rounds max, rapid fire, debris 30%, pillage 50%, chance de lune

import { SHIPS, DEFENSES } from '../data/ships.js';

// Stats de combat par unite (attaque, bouclier, coque)
const UNIT_STATS: Record<string, { attack: number; shield: number; hull: number; cost: { metal: number; crystal: number } }> = {
  // Vaisseaux
  smallCargo:       { attack: 5, shield: 10, hull: 4000, cost: { metal: 2000, crystal: 2000 } },
  largeCargo:       { attack: 5, shield: 25, hull: 12000, cost: { metal: 6000, crystal: 6000 } },
  recycler:         { attack: 1, shield: 10, hull: 16000, cost: { metal: 10000, crystal: 6000 } },
  espionageProbe:   { attack: 0, shield: 0, hull: 1000, cost: { metal: 0, crystal: 1000 } },
  solarSatellite:   { attack: 1, shield: 1, hull: 2000, cost: { metal: 0, crystal: 2000 } },
  colonyShip:       { attack: 0, shield: 100, hull: 30000, cost: { metal: 10000, crystal: 20000 } },
  lightFighter:     { attack: 50, shield: 10, hull: 4000, cost: { metal: 3000, crystal: 1000 } },
  heavyFighter:     { attack: 150, shield: 25, hull: 10000, cost: { metal: 6000, crystal: 4000 } },
  cruiser:          { attack: 400, shield: 50, hull: 27000, cost: { metal: 20000, crystal: 7000 } },
  battleship:       { attack: 1000, shield: 200, hull: 60000, cost: { metal: 45000, crystal: 15000 } },
  bomber:           { attack: 1000, shield: 500, hull: 75000, cost: { metal: 50000, crystal: 25000 } },
  destroyer:        { attack: 2000, shield: 500, hull: 110000, cost: { metal: 60000, crystal: 50000 } },
  deathstar:        { attack: 200000, shield: 50000, hull: 9000000, cost: { metal: 5000000, crystal: 4000000 } },
  // Defenses
  rocketLauncher:   { attack: 80, shield: 20, hull: 2000, cost: { metal: 2000, crystal: 0 } },
  lightLaser:       { attack: 100, shield: 25, hull: 2000, cost: { metal: 1500, crystal: 500 } },
  heavyLaser:       { attack: 250, shield: 100, hull: 8000, cost: { metal: 6000, crystal: 2000 } },
  gaussCannon:      { attack: 1100, shield: 200, hull: 35000, cost: { metal: 20000, crystal: 15000 } },
  ionCannon:        { attack: 150, shield: 500, hull: 8000, cost: { metal: 5000, crystal: 3000 } },
  plasmaTurret:     { attack: 3000, shield: 300, hull: 100000, cost: { metal: 50000, crystal: 50000 } },
  smallShieldDome:  { attack: 1, shield: 2000, hull: 20000, cost: { metal: 10000, crystal: 10000 } },
  largeShieldDome:  { attack: 1, shield: 10000, hull: 100000, cost: { metal: 50000, crystal: 50000 } },
};

const DEFENSE_TYPES = new Set(Object.keys(DEFENSES));

const SHIP_CARGO: Record<string, number> = {
  smallCargo: 5000, largeCargo: 25000, recycler: 20000, colonyShip: 7500,
};

// Rapid fire
const RAPID_FIRE: Record<string, Record<string, number>> = {
  lightFighter: { espionageProbe: 5, solarSatellite: 5 },
  heavyFighter: { smallCargo: 3, espionageProbe: 5, solarSatellite: 5 },
  cruiser: { lightFighter: 6, espionageProbe: 5, solarSatellite: 5, rocketLauncher: 10 },
  battleship: { espionageProbe: 5, solarSatellite: 5 },
  bomber: { espionageProbe: 5, solarSatellite: 5, rocketLauncher: 20, lightLaser: 20, heavyLaser: 10, ionCannon: 10, gaussCannon: 5 },
  destroyer: { espionageProbe: 5, solarSatellite: 5, lightLaser: 10, battleship: 2 },
  deathstar: {
    smallCargo: 250, largeCargo: 250, lightFighter: 200, heavyFighter: 100,
    cruiser: 33, battleship: 30, bomber: 25, destroyer: 5,
    espionageProbe: 1250, solarSatellite: 1250, recycler: 250, colonyShip: 250,
    rocketLauncher: 200, lightLaser: 200, heavyLaser: 100, gaussCannon: 50, ionCannon: 100,
  },
};

interface CombatUnit {
  type: string;
  attack: number;
  shield: number;
  shieldMax: number;
  hull: number;
  hullMax: number;
}

export interface CombatRoundResult {
  round: number;
  attackerUnits: number;
  defenderUnits: number;
  attackerLosses: number;
  defenderLosses: number;
}

export interface CombatResult {
  winner: 'attacker' | 'defender' | 'draw';
  rounds: CombatRoundResult[];
  attackerSurvivors: Record<string, number>;
  defenderSurvivors: Record<string, number>;
  attackerLosses: Record<string, number>;
  defenderLosses: Record<string, number>;
  debris: { metal: number; crystal: number };
  loot: { metal: number; crystal: number; deuterium: number };
  moonChance: number;
}

function createUnit(type: string, weaponTech: number, shieldTech: number, armourTech: number): CombatUnit {
  const data = UNIT_STATS[type];
  if (!data) return { type, attack: 0, shield: 0, shieldMax: 0, hull: 1000, hullMax: 1000 };
  const attack = Math.floor(data.attack * (1 + 0.1 * weaponTech));
  const shield = Math.floor(data.shield * (1 + 0.1 * shieldTech));
  const hull = Math.floor(data.hull * (1 + 0.1 * armourTech));
  return { type, attack, shield, shieldMax: shield, hull, hullMax: hull };
}

function buildFleet(composition: Record<string, number>, wt: number, st: number, at: number): CombatUnit[] {
  const units: CombatUnit[] = [];
  for (const [type, count] of Object.entries(composition)) {
    if (!count || count <= 0) continue;
    for (let i = 0; i < count; i++) {
      units.push(createUnit(type, wt, st, at));
    }
  }
  return units;
}

function fireAt(attacker: CombatUnit, defender: CombatUnit): void {
  let damage = attacker.attack;
  if (damage < defender.shield * 0.01) return;
  if (defender.shield > 0) {
    const absorbed = Math.min(defender.shield, damage);
    defender.shield -= absorbed;
    damage -= absorbed;
  }
  if (damage > 0) {
    defender.hull -= damage;
  }
}

function shouldExplode(unit: CombatUnit): boolean {
  if (unit.hull <= 0) return true;
  const hullPercent = unit.hull / unit.hullMax;
  if (hullPercent >= 0.7) return false;
  return Math.random() < (1 - hullPercent / 0.7);
}

function combatRound(attackers: CombatUnit[], defenders: CombatUnit[]): { aLost: number; dLost: number } {
  // Restaurer boucliers
  for (const u of attackers) u.shield = u.shieldMax;
  for (const u of defenders) u.shield = u.shieldMax;

  // Attaquant tire
  for (const aUnit of attackers) {
    if (defenders.length === 0) break;
    const targetIdx = Math.floor(Math.random() * defenders.length);
    fireAt(aUnit, defenders[targetIdx]);

    const rf = RAPID_FIRE[aUnit.type];
    if (rf) {
      for (const [targetType, ratio] of Object.entries(rf)) {
        let shots = 0;
        while (shots < ratio - 1 && Math.random() < (ratio - 1) / ratio) {
          const targets = defenders.filter((u) => u.type === targetType);
          if (targets.length === 0) break;
          fireAt(aUnit, targets[Math.floor(Math.random() * targets.length)]);
          shots++;
        }
      }
    }
  }

  // Defenseur tire
  for (const dUnit of defenders) {
    if (attackers.length === 0) break;
    const targetIdx = Math.floor(Math.random() * attackers.length);
    fireAt(dUnit, attackers[targetIdx]);

    const rf = RAPID_FIRE[dUnit.type];
    if (rf) {
      for (const [targetType, ratio] of Object.entries(rf)) {
        let shots = 0;
        while (shots < ratio - 1 && Math.random() < (ratio - 1) / ratio) {
          const targets = attackers.filter((u) => u.type === targetType);
          if (targets.length === 0) break;
          fireAt(dUnit, targets[Math.floor(Math.random() * targets.length)]);
          shots++;
        }
      }
    }
  }

  const aBefore = attackers.length;
  const dBefore = defenders.length;

  // Retirer les unites detruites (in-place filtering)
  let i = attackers.length;
  while (i--) { if (shouldExplode(attackers[i])) attackers.splice(i, 1); }
  i = defenders.length;
  while (i--) { if (shouldExplode(defenders[i])) defenders.splice(i, 1); }

  return { aLost: aBefore - attackers.length, dLost: dBefore - defenders.length };
}

function countUnits(units: CombatUnit[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const u of units) {
    counts[u.type] = (counts[u.type] || 0) + 1;
  }
  return counts;
}

export function simulateCombat(input: {
  attacker: {
    ships: Record<string, number>;
    weaponTech: number;
    shieldTech: number;
    armourTech: number;
  };
  defender: {
    ships: Record<string, number>;
    defenses: Record<string, number>;
    weaponTech: number;
    shieldTech: number;
    armourTech: number;
    resources: { metal: number; crystal: number; deuterium: number };
  };
}): CombatResult {
  const attackers = buildFleet(input.attacker.ships, input.attacker.weaponTech, input.attacker.shieldTech, input.attacker.armourTech);
  const defenders = buildFleet(
    { ...input.defender.ships, ...input.defender.defenses },
    input.defender.weaponTech, input.defender.shieldTech, input.defender.armourTech,
  );

  const attackerInitial = countUnits(attackers);
  const defenderInitial = countUnits(defenders);

  const rounds: CombatRoundResult[] = [];

  for (let round = 1; round <= 6; round++) {
    if (attackers.length === 0 || defenders.length === 0) break;
    const { aLost, dLost } = combatRound(attackers, defenders);
    rounds.push({
      round,
      attackerUnits: attackers.length,
      defenderUnits: defenders.length,
      attackerLosses: aLost,
      defenderLosses: dLost,
    });
  }

  const hasAttacker = attackers.length > 0;
  const hasDefender = defenders.length > 0;
  const winner = hasAttacker && !hasDefender ? 'attacker'
    : !hasAttacker && hasDefender ? 'defender' : 'draw';

  const attackerSurvivors = countUnits(attackers);
  const defenderSurvivors = countUnits(defenders);

  const attackerLosses: Record<string, number> = {};
  const defenderLosses: Record<string, number> = {};

  for (const [type, count] of Object.entries(attackerInitial)) {
    const lost = count - (attackerSurvivors[type] || 0);
    if (lost > 0) attackerLosses[type] = lost;
  }
  for (const [type, count] of Object.entries(defenderInitial)) {
    const lost = count - (defenderSurvivors[type] || 0);
    if (lost > 0) defenderLosses[type] = lost;
  }

  // Debris : 30% metal + crystal des vaisseaux detruits (pas les defenses)
  let debrisMetal = 0;
  let debrisCrystal = 0;
  for (const losses of [attackerLosses, defenderLosses]) {
    for (const [type, count] of Object.entries(losses)) {
      if (DEFENSE_TYPES.has(type)) continue; // defenses pas de debris
      const stats = UNIT_STATS[type];
      if (stats) {
        debrisMetal += stats.cost.metal * count * 0.3;
        debrisCrystal += stats.cost.crystal * count * 0.3;
      }
    }
  }

  // Pillage : attaquant gagne -> 50% des ressources, limite par cargo
  let loot = { metal: 0, crystal: 0, deuterium: 0 };
  if (winner === 'attacker') {
    const totalCargo = attackers.reduce((sum, u) => sum + (SHIP_CARGO[u.type] || 0), 0);
    const available = {
      metal: Math.floor(input.defender.resources.metal * 0.5),
      crystal: Math.floor(input.defender.resources.crystal * 0.5),
      deuterium: Math.floor(input.defender.resources.deuterium * 0.5),
    };
    const totalAvailable = available.metal + available.crystal + available.deuterium;
    if (totalAvailable <= totalCargo) {
      loot = available;
    } else {
      const ratio = totalCargo / totalAvailable;
      loot = {
        metal: Math.floor(available.metal * ratio),
        crystal: Math.floor(available.crystal * ratio),
        deuterium: Math.floor(available.deuterium * ratio),
      };
    }
  }

  // Chance de lune : 1% par 100k debris, max 20%
  const moonChance = Math.min(20, Math.floor((debrisMetal + debrisCrystal) / 100000));

  return {
    winner, rounds,
    attackerSurvivors, defenderSurvivors,
    attackerLosses, defenderLosses,
    debris: { metal: Math.floor(debrisMetal), crystal: Math.floor(debrisCrystal) },
    loot, moonChance,
  };
}
