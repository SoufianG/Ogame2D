import type { ShipType, DefenseType } from '../types/fleet';
import { SHIPS_DATA, DEFENSES_DATA } from '../data/ships';

// === TYPES ===
export type UnitType = ShipType | DefenseType;

export interface CombatUnit {
  type: UnitType;
  attack: number;
  shield: number;
  shieldMax: number;
  hull: number;
  hullMax: number;
}

export interface CombatFleet {
  units: CombatUnit[];
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
  attackerSurvivors: Partial<Record<UnitType, number>>;
  defenderSurvivors: Partial<Record<UnitType, number>>;
  attackerLosses: Partial<Record<UnitType, number>>;
  defenderLosses: Partial<Record<UnitType, number>>;
  debris: { metal: number; crystal: number };
  loot: { metal: number; crystal: number; deuterium: number };
  moonChance: number; // 0-100
}

// === RAPID FIRE ===
// Ratios de rapid fire OGame simplifies (un vaisseau tire N fois sur un type)
const RAPID_FIRE: Partial<Record<UnitType, Partial<Record<UnitType, number>>>> = {
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

// === HELPERS ===
function getUnitData(type: UnitType) {
  return (SHIPS_DATA as Record<string, { attack: number; shield: number; hull: number; cost: { metal: number; crystal: number; deuterium: number } }>)[type]
    ?? (DEFENSES_DATA as Record<string, { attack: number; shield: number; hull: number; cost: { metal: number; crystal: number; deuterium: number } }>)[type];
}

function createUnit(type: UnitType, weaponTech: number, shieldTech: number, armourTech: number): CombatUnit {
  const data = getUnitData(type);
  const attack = Math.floor(data.attack * (1 + 0.1 * weaponTech));
  const shield = Math.floor(data.shield * (1 + 0.1 * shieldTech));
  const hull = Math.floor(data.hull * (1 + 0.1 * armourTech));
  return { type, attack, shield, shieldMax: shield, hull, hullMax: hull };
}

function buildFleet(
  composition: Partial<Record<UnitType, number>>,
  weaponTech: number,
  shieldTech: number,
  armourTech: number,
): CombatFleet {
  const units: CombatUnit[] = [];
  for (const [type, count] of Object.entries(composition)) {
    for (let i = 0; i < count!; i++) {
      units.push(createUnit(type as UnitType, weaponTech, shieldTech, armourTech));
    }
  }
  return { units };
}

// Un tir contre une unite
function fireAt(attacker: CombatUnit, defender: CombatUnit): void {
  let damage = attacker.attack;

  // Si le dommage < 1% du bouclier, le tir est absorbe
  if (damage < defender.shield * 0.01) return;

  // Absorber par le bouclier
  if (defender.shield > 0) {
    const absorbed = Math.min(defender.shield, damage);
    defender.shield -= absorbed;
    damage -= absorbed;
  }

  // Le reste va sur la coque
  if (damage > 0) {
    defender.hull -= damage;
  }
}

// Verifier si l'unite explose (coque < 70% -> chance d'exploser proportionnelle)
function shouldExplode(unit: CombatUnit): boolean {
  if (unit.hull <= 0) return true;
  const hullPercent = unit.hull / unit.hullMax;
  if (hullPercent >= 0.7) return false;
  // Chance d'exploser : lineaire de 0% a 70% -> 0% a 100%
  const explodeChance = 1 - (hullPercent / 0.7);
  return Math.random() < explodeChance;
}

// Un round de combat
function combatRound(attacker: CombatFleet, defender: CombatFleet): { attackerLost: number; defenderLost: number } {
  // Restaurer les boucliers au debut de chaque round
  for (const u of attacker.units) u.shield = u.shieldMax;
  for (const u of defender.units) u.shield = u.shieldMax;

  // Attaquant tire sur defenseur
  for (const aUnit of attacker.units) {
    if (defender.units.length === 0) break;

    // Tir principal
    let targetIdx = Math.floor(Math.random() * defender.units.length);
    fireAt(aUnit, defender.units[targetIdx]);

    // Rapid fire
    const rf = RAPID_FIRE[aUnit.type];
    if (rf) {
      for (const [targetType, ratio] of Object.entries(rf)) {
        // Chance de tirer a nouveau = (ratio - 1) / ratio
        let shots = 0;
        while (shots < ratio! - 1 && Math.random() < (ratio! - 1) / ratio!) {
          const targets = defender.units.filter((u) => u.type === targetType);
          if (targets.length === 0) break;
          const target = targets[Math.floor(Math.random() * targets.length)];
          fireAt(aUnit, target);
          shots++;
        }
      }
    }
  }

  // Defenseur tire sur attaquant
  for (const dUnit of defender.units) {
    if (attacker.units.length === 0) break;

    let targetIdx = Math.floor(Math.random() * attacker.units.length);
    fireAt(dUnit, attacker.units[targetIdx]);

    const rf = RAPID_FIRE[dUnit.type];
    if (rf) {
      for (const [targetType, ratio] of Object.entries(rf)) {
        let shots = 0;
        while (shots < ratio! - 1 && Math.random() < (ratio! - 1) / ratio!) {
          const targets = attacker.units.filter((u) => u.type === targetType);
          if (targets.length === 0) break;
          const target = targets[Math.floor(Math.random() * targets.length)];
          fireAt(dUnit, target);
          shots++;
        }
      }
    }
  }

  // Retirer les unites detruites
  const aBefore = attacker.units.length;
  const dBefore = defender.units.length;
  attacker.units = attacker.units.filter((u) => !shouldExplode(u));
  defender.units = defender.units.filter((u) => !shouldExplode(u));

  return {
    attackerLost: aBefore - attacker.units.length,
    defenderLost: dBefore - defender.units.length,
  };
}

// Compteur d'unites par type
function countUnits(fleet: CombatFleet): Partial<Record<UnitType, number>> {
  const counts: Partial<Record<UnitType, number>> = {};
  for (const u of fleet.units) {
    counts[u.type] = (counts[u.type] || 0) + 1;
  }
  return counts;
}

// === SIMULATION PRINCIPALE ===
export interface CombatInput {
  attacker: {
    ships: Partial<Record<UnitType, number>>;
    weaponTech: number;
    shieldTech: number;
    armourTech: number;
  };
  defender: {
    ships: Partial<Record<UnitType, number>>;
    defenses: Partial<Record<UnitType, number>>;
    weaponTech: number;
    shieldTech: number;
    armourTech: number;
    resources: { metal: number; crystal: number; deuterium: number };
  };
}

export function simulateCombat(input: CombatInput): CombatResult {
  const attackerFleet = buildFleet(input.attacker.ships, input.attacker.weaponTech, input.attacker.shieldTech, input.attacker.armourTech);
  const defenderFleet = buildFleet(
    { ...input.defender.ships, ...input.defender.defenses },
    input.defender.weaponTech, input.defender.shieldTech, input.defender.armourTech,
  );

  const attackerInitial = countUnits(attackerFleet);
  const defenderInitial = countUnits(defenderFleet);

  const rounds: CombatRoundResult[] = [];
  const MAX_ROUNDS = 6;

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    if (attackerFleet.units.length === 0 || defenderFleet.units.length === 0) break;

    const { attackerLost, defenderLost } = combatRound(attackerFleet, defenderFleet);

    rounds.push({
      round,
      attackerUnits: attackerFleet.units.length,
      defenderUnits: defenderFleet.units.length,
      attackerLosses: attackerLost,
      defenderLosses: defenderLost,
    });
  }

  // Determiner le vainqueur
  const hasAttacker = attackerFleet.units.length > 0;
  const hasDefender = defenderFleet.units.length > 0;
  const winner = hasAttacker && !hasDefender ? 'attacker'
    : !hasAttacker && hasDefender ? 'defender'
    : 'draw';

  // Survivants
  const attackerSurvivors = countUnits(attackerFleet);
  const defenderSurvivors = countUnits(defenderFleet);

  // Pertes
  const attackerLosses: Partial<Record<UnitType, number>> = {};
  const defenderLosses: Partial<Record<UnitType, number>> = {};

  for (const [type, count] of Object.entries(attackerInitial)) {
    const survived = attackerSurvivors[type as UnitType] || 0;
    const lost = count! - survived;
    if (lost > 0) attackerLosses[type as UnitType] = lost;
  }
  for (const [type, count] of Object.entries(defenderInitial)) {
    const survived = defenderSurvivors[type as UnitType] || 0;
    const lost = count! - survived;
    if (lost > 0) defenderLosses[type as UnitType] = lost;
  }

  // Debris : 30% du metal et cristal des vaisseaux detruits (pas les defenses)
  let debrisMetal = 0;
  let debrisCrystal = 0;
  for (const [type, count] of Object.entries(attackerLosses)) {
    const data = getUnitData(type as UnitType);
    if (data) {
      debrisMetal += data.cost.metal * count! * 0.3;
      debrisCrystal += data.cost.crystal * count! * 0.3;
    }
  }
  for (const [type, count] of Object.entries(defenderLosses)) {
    const data = getUnitData(type as UnitType);
    // Les defenses ne generent pas de debris
    if (data && !(type in DEFENSES_DATA)) {
      debrisMetal += data.cost.metal * count! * 0.3;
      debrisCrystal += data.cost.crystal * count! * 0.3;
    }
  }

  // Pillage : si l'attaquant gagne, il prend 50% des ressources (limite par le cargo)
  let loot = { metal: 0, crystal: 0, deuterium: 0 };
  if (winner === 'attacker') {
    const totalCargo = attackerFleet.units.reduce((sum, u) => {
      const shipData = SHIPS_DATA[u.type as ShipType];
      return sum + (shipData?.cargo || 0);
    }, 0);

    const maxLoot = totalCargo;
    const available = {
      metal: Math.floor(input.defender.resources.metal * 0.5),
      crystal: Math.floor(input.defender.resources.crystal * 0.5),
      deuterium: Math.floor(input.defender.resources.deuterium * 0.5),
    };

    // Repartir equitablement dans la limite du cargo
    const totalAvailable = available.metal + available.crystal + available.deuterium;
    if (totalAvailable <= maxLoot) {
      loot = available;
    } else {
      const ratio = maxLoot / totalAvailable;
      loot = {
        metal: Math.floor(available.metal * ratio),
        crystal: Math.floor(available.crystal * ratio),
        deuterium: Math.floor(available.deuterium * ratio),
      };
    }
  }

  // Chance de lune : 1% par 100 000 unites de debris, max 20%
  const totalDebris = debrisMetal + debrisCrystal;
  const moonChance = Math.min(20, Math.floor(totalDebris / 100000));

  return {
    winner,
    rounds,
    attackerSurvivors,
    defenderSurvivors,
    attackerLosses,
    defenderLosses,
    debris: { metal: Math.floor(debrisMetal), crystal: Math.floor(debrisCrystal) },
    loot,
    moonChance,
  };
}
