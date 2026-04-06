export interface UnitDef {
  id: string;
  category: 'ship' | 'defense';
  cost: { metal: number; crystal: number; deuterium: number };
  prerequisites: {
    buildings?: Record<string, number>;
    research?: Record<string, number>;
  };
}

// Temps de construction par unite en secondes
// Formule OGame : (metal + crystal) / (2500 * (1 + shipyardLevel)) * 3600
export function getUnitTime(cost: { metal: number; crystal: number }, shipyardLevel: number): number {
  const base = (cost.metal + cost.crystal) / (2500 * (1 + shipyardLevel));
  return Math.max(1, Math.floor(base * 3600));
}

export const SHIPS: Record<string, UnitDef> = {
  smallCargo: {
    id: 'smallCargo', category: 'ship',
    cost: { metal: 2000, crystal: 2000, deuterium: 0 },
    prerequisites: { buildings: { shipyard: 2 }, research: { combustionDrive: 2 } },
  },
  largeCargo: {
    id: 'largeCargo', category: 'ship',
    cost: { metal: 6000, crystal: 6000, deuterium: 0 },
    prerequisites: { buildings: { shipyard: 4 }, research: { combustionDrive: 6 } },
  },
  recycler: {
    id: 'recycler', category: 'ship',
    cost: { metal: 10000, crystal: 6000, deuterium: 2000 },
    prerequisites: { buildings: { shipyard: 4 }, research: { combustionDrive: 6, shieldingTech: 2 } },
  },
  espionageProbe: {
    id: 'espionageProbe', category: 'ship',
    cost: { metal: 0, crystal: 1000, deuterium: 0 },
    prerequisites: { buildings: { shipyard: 3 }, research: { combustionDrive: 3, espionageTech: 2 } },
  },
  solarSatellite: {
    id: 'solarSatellite', category: 'ship',
    cost: { metal: 0, crystal: 2000, deuterium: 500 },
    prerequisites: { buildings: { shipyard: 1 } },
  },
  colonyShip: {
    id: 'colonyShip', category: 'ship',
    cost: { metal: 10000, crystal: 20000, deuterium: 10000 },
    prerequisites: { buildings: { shipyard: 4 }, research: { impulseDrive: 3 } },
  },
  lightFighter: {
    id: 'lightFighter', category: 'ship',
    cost: { metal: 3000, crystal: 1000, deuterium: 0 },
    prerequisites: { buildings: { shipyard: 1 }, research: { combustionDrive: 1 } },
  },
  heavyFighter: {
    id: 'heavyFighter', category: 'ship',
    cost: { metal: 6000, crystal: 4000, deuterium: 0 },
    prerequisites: { buildings: { shipyard: 3 }, research: { armourTech: 2, impulseDrive: 2 } },
  },
  cruiser: {
    id: 'cruiser', category: 'ship',
    cost: { metal: 20000, crystal: 7000, deuterium: 2000 },
    prerequisites: { buildings: { shipyard: 5 }, research: { impulseDrive: 4, ionTech: 2 } },
  },
  battleship: {
    id: 'battleship', category: 'ship',
    cost: { metal: 45000, crystal: 15000, deuterium: 0 },
    prerequisites: { buildings: { shipyard: 7 }, research: { hyperspaceDrive: 4 } },
  },
  bomber: {
    id: 'bomber', category: 'ship',
    cost: { metal: 50000, crystal: 25000, deuterium: 15000 },
    prerequisites: { buildings: { shipyard: 8 }, research: { impulseDrive: 6, plasmaTech: 5 } },
  },
  destroyer: {
    id: 'destroyer', category: 'ship',
    cost: { metal: 60000, crystal: 50000, deuterium: 15000 },
    prerequisites: { buildings: { shipyard: 9 }, research: { hyperspaceDrive: 6 } },
  },
  deathstar: {
    id: 'deathstar', category: 'ship',
    cost: { metal: 5000000, crystal: 4000000, deuterium: 1000000 },
    prerequisites: { buildings: { shipyard: 12 }, research: { hyperspaceDrive: 7, gravitonTech: 1 } },
  },
};

export const DEFENSES: Record<string, UnitDef> = {
  rocketLauncher: {
    id: 'rocketLauncher', category: 'defense',
    cost: { metal: 2000, crystal: 0, deuterium: 0 },
    prerequisites: { buildings: { shipyard: 1 } },
  },
  lightLaser: {
    id: 'lightLaser', category: 'defense',
    cost: { metal: 1500, crystal: 500, deuterium: 0 },
    prerequisites: { buildings: { shipyard: 2 }, research: { energyTech: 1, laserTech: 3 } },
  },
  heavyLaser: {
    id: 'heavyLaser', category: 'defense',
    cost: { metal: 6000, crystal: 2000, deuterium: 0 },
    prerequisites: { buildings: { shipyard: 4 }, research: { energyTech: 3, laserTech: 6 } },
  },
  gaussCannon: {
    id: 'gaussCannon', category: 'defense',
    cost: { metal: 20000, crystal: 15000, deuterium: 2000 },
    prerequisites: { buildings: { shipyard: 6 }, research: { energyTech: 6, weaponsTech: 3, shieldingTech: 1 } },
  },
  ionCannon: {
    id: 'ionCannon', category: 'defense',
    cost: { metal: 5000, crystal: 3000, deuterium: 0 },
    prerequisites: { buildings: { shipyard: 4 }, research: { ionTech: 4 } },
  },
  plasmaTurret: {
    id: 'plasmaTurret', category: 'defense',
    cost: { metal: 50000, crystal: 50000, deuterium: 30000 },
    prerequisites: { buildings: { shipyard: 8 }, research: { plasmaTech: 7 } },
  },
  smallShieldDome: {
    id: 'smallShieldDome', category: 'defense',
    cost: { metal: 10000, crystal: 10000, deuterium: 0 },
    prerequisites: { buildings: { shipyard: 1 }, research: { shieldingTech: 2 } },
  },
  largeShieldDome: {
    id: 'largeShieldDome', category: 'defense',
    cost: { metal: 50000, crystal: 50000, deuterium: 0 },
    prerequisites: { buildings: { shipyard: 6 }, research: { shieldingTech: 6 } },
  },
  interplanetaryMissile: {
    id: 'interplanetaryMissile', category: 'defense',
    cost: { metal: 12500, crystal: 2500, deuterium: 10000 },
    prerequisites: { buildings: { shipyard: 4, missileSilo: 4 }, research: { impulseDrive: 1 } },
  },
  antiBallisticMissile: {
    id: 'antiBallisticMissile', category: 'defense',
    cost: { metal: 8000, crystal: 0, deuterium: 2000 },
    prerequisites: { buildings: { missileSilo: 2 } },
  },
};

export const ALL_UNITS: Record<string, UnitDef> = { ...SHIPS, ...DEFENSES };
