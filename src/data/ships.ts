import type { Resources } from '../types';
import type { ShipType, DefenseType } from '../types/fleet';
import type { BuildingType } from '../types/building';
import type { ResearchType } from '../types/research';

export interface UnitData {
  id: ShipType | DefenseType;
  name: string;
  description: string;
  type: 'ship' | 'defense';
  cost: Resources;
  attack: number;
  shield: number;
  hull: number;
  cargo?: number;
  speed?: number;
  prerequisites: {
    buildings?: Partial<Record<BuildingType, number>>;
    research?: Partial<Record<ResearchType, number>>;
  };
}

// Temps de construction par unite en secondes
// Formule : (metal + crystal) / (2500 * (1 + shipyardLevel)) * 3600
export function getUnitTime(cost: Resources, shipyardLevel: number): number {
  const base = (cost.metal + cost.crystal) / (2500 * (1 + shipyardLevel));
  return Math.max(1, Math.floor(base * 3600));
}

export const SHIPS_DATA: Record<ShipType, UnitData> = {
  smallCargo: {
    id: 'smallCargo',
    name: 'Petit Transporteur',
    description: 'Transport basique avec une petite soute.',
    type: 'ship',
    cost: { metal: 2000, crystal: 2000, deuterium: 0 },
    attack: 5, shield: 10, hull: 4000, cargo: 5000, speed: 5000,
    prerequisites: {
      buildings: { shipyard: 2 },
      research: { combustionDrive: 2 },
    },
  },
  largeCargo: {
    id: 'largeCargo',
    name: 'Grand Transporteur',
    description: 'Transport lourd pour de grands convois.',
    type: 'ship',
    cost: { metal: 6000, crystal: 6000, deuterium: 0 },
    attack: 5, shield: 25, hull: 12000, cargo: 25000, speed: 7500,
    prerequisites: {
      buildings: { shipyard: 4 },
      research: { combustionDrive: 6 },
    },
  },
  recycler: {
    id: 'recycler',
    name: 'Recycleur',
    description: 'Collecte les champs de debris apres les batailles.',
    type: 'ship',
    cost: { metal: 10000, crystal: 6000, deuterium: 2000 },
    attack: 1, shield: 10, hull: 16000, cargo: 20000, speed: 2000,
    prerequisites: {
      buildings: { shipyard: 4 },
      research: { combustionDrive: 6, shieldingTech: 2 },
    },
  },
  espionageProbe: {
    id: 'espionageProbe',
    name: 'Sonde d\'Espionnage',
    description: 'Sonde rapide et furtive pour espionner les planetes.',
    type: 'ship',
    cost: { metal: 0, crystal: 1000, deuterium: 0 },
    attack: 0, shield: 0, hull: 1000, cargo: 0, speed: 100000000,
    prerequisites: {
      buildings: { shipyard: 3 },
      research: { combustionDrive: 3, espionageTech: 2 },
    },
  },
  solarSatellite: {
    id: 'solarSatellite',
    name: 'Satellite Solaire',
    description: 'Produit de l\'energie en orbite. Detruit en cas d\'attaque.',
    type: 'ship',
    cost: { metal: 0, crystal: 2000, deuterium: 500 },
    attack: 1, shield: 1, hull: 2000,
    prerequisites: {
      buildings: { shipyard: 1 },
    },
  },
  colonyShip: {
    id: 'colonyShip',
    name: 'Vaisseau de Colonisation',
    description: 'Permet de coloniser une planete vierge.',
    type: 'ship',
    cost: { metal: 10000, crystal: 20000, deuterium: 10000 },
    attack: 0, shield: 100, hull: 30000, cargo: 7500, speed: 2500,
    prerequisites: {
      buildings: { shipyard: 4 },
      research: { impulseDrive: 3 },
    },
  },
  lightFighter: {
    id: 'lightFighter',
    name: 'Chasseur Leger',
    description: 'Unite militaire de base, rapide et peu couteuse.',
    type: 'ship',
    cost: { metal: 3000, crystal: 1000, deuterium: 0 },
    attack: 50, shield: 10, hull: 4000, speed: 12500,
    prerequisites: {
      buildings: { shipyard: 1 },
      research: { combustionDrive: 1 },
    },
  },
  heavyFighter: {
    id: 'heavyFighter',
    name: 'Chasseur Lourd',
    description: 'Plus resistant que le chasseur leger.',
    type: 'ship',
    cost: { metal: 6000, crystal: 4000, deuterium: 0 },
    attack: 150, shield: 25, hull: 10000, speed: 10000,
    prerequisites: {
      buildings: { shipyard: 3 },
      research: { armourTech: 2, impulseDrive: 2 },
    },
  },
  cruiser: {
    id: 'cruiser',
    name: 'Croiseur',
    description: 'Anti-chasseurs, bonus contre les missiles.',
    type: 'ship',
    cost: { metal: 20000, crystal: 7000, deuterium: 2000 },
    attack: 400, shield: 50, hull: 27000, speed: 15000,
    prerequisites: {
      buildings: { shipyard: 5 },
      research: { impulseDrive: 4, ionTech: 2 },
    },
  },
  battleship: {
    id: 'battleship',
    name: 'Vaisseau de Bataille',
    description: 'Vaisseau polyvalent et puissant.',
    type: 'ship',
    cost: { metal: 45000, crystal: 15000, deuterium: 0 },
    attack: 1000, shield: 200, hull: 60000, speed: 10000,
    prerequisites: {
      buildings: { shipyard: 7 },
      research: { hyperspaceDrive: 4 },
    },
  },
  bomber: {
    id: 'bomber',
    name: 'Bombardier',
    description: 'Specialise contre les defenses planetaires.',
    type: 'ship',
    cost: { metal: 50000, crystal: 25000, deuterium: 15000 },
    attack: 1000, shield: 500, hull: 75000, speed: 4000,
    prerequisites: {
      buildings: { shipyard: 8 },
      research: { impulseDrive: 6, plasmaTech: 5 },
    },
  },
  destroyer: {
    id: 'destroyer',
    name: 'Destructeur',
    description: 'Vaisseau capital, le plus puissant en attaque.',
    type: 'ship',
    cost: { metal: 60000, crystal: 50000, deuterium: 15000 },
    attack: 2000, shield: 500, hull: 110000, speed: 5000,
    prerequisites: {
      buildings: { shipyard: 9 },
      research: { hyperspaceDrive: 6 },
    },
  },
  deathstar: {
    id: 'deathstar',
    name: 'Etoile de la Mort',
    description: 'L\'arme ultime. Peut detruire des lunes.',
    type: 'ship',
    cost: { metal: 5000000, crystal: 4000000, deuterium: 1000000 },
    attack: 200000, shield: 50000, hull: 9000000, speed: 100,
    prerequisites: {
      buildings: { shipyard: 12 },
      research: { hyperspaceDrive: 7, gravitonTech: 1 },
    },
  },
};

export const DEFENSES_DATA: Record<DefenseType, UnitData> = {
  rocketLauncher: {
    id: 'rocketLauncher',
    name: 'Lance-Missiles',
    description: 'Defense legere de base.',
    type: 'defense',
    cost: { metal: 2000, crystal: 0, deuterium: 0 },
    attack: 80, shield: 20, hull: 2000,
    prerequisites: {
      buildings: { shipyard: 1 },
    },
  },
  lightLaser: {
    id: 'lightLaser',
    name: 'Artillerie Legere Laser',
    description: 'Efficace contre les chasseurs.',
    type: 'defense',
    cost: { metal: 1500, crystal: 500, deuterium: 0 },
    attack: 100, shield: 25, hull: 2000,
    prerequisites: {
      buildings: { shipyard: 2 },
      research: { energyTech: 1, laserTech: 3 },
    },
  },
  heavyLaser: {
    id: 'heavyLaser',
    name: 'Artillerie Lourde Laser',
    description: 'Defense polyvalente.',
    type: 'defense',
    cost: { metal: 6000, crystal: 2000, deuterium: 0 },
    attack: 250, shield: 100, hull: 8000,
    prerequisites: {
      buildings: { shipyard: 4 },
      research: { energyTech: 3, laserTech: 6 },
    },
  },
  gaussCannon: {
    id: 'gaussCannon',
    name: 'Canon Gaussien',
    description: 'Anti gros vaisseaux.',
    type: 'defense',
    cost: { metal: 20000, crystal: 15000, deuterium: 2000 },
    attack: 1100, shield: 200, hull: 35000,
    prerequisites: {
      buildings: { shipyard: 6 },
      research: { energyTech: 6, weaponsTech: 3, shieldingTech: 1 },
    },
  },
  ionCannon: {
    id: 'ionCannon',
    name: 'Canon Ionique',
    description: 'Reduit les boucliers ennemis.',
    type: 'defense',
    cost: { metal: 5000, crystal: 3000, deuterium: 0 },
    attack: 150, shield: 500, hull: 8000,
    prerequisites: {
      buildings: { shipyard: 4 },
      research: { ionTech: 4 },
    },
  },
  plasmaTurret: {
    id: 'plasmaTurret',
    name: 'Lanceur de Plasma',
    description: 'La defense ultime.',
    type: 'defense',
    cost: { metal: 50000, crystal: 50000, deuterium: 30000 },
    attack: 3000, shield: 300, hull: 100000,
    prerequisites: {
      buildings: { shipyard: 8 },
      research: { plasmaTech: 7 },
    },
  },
  smallShieldDome: {
    id: 'smallShieldDome',
    name: 'Petit Bouclier Planetaire',
    description: 'Bouclier global de la planete.',
    type: 'defense',
    cost: { metal: 10000, crystal: 10000, deuterium: 0 },
    attack: 1, shield: 2000, hull: 20000,
    prerequisites: {
      buildings: { shipyard: 1 },
      research: { shieldingTech: 2 },
    },
  },
  largeShieldDome: {
    id: 'largeShieldDome',
    name: 'Grand Bouclier Planetaire',
    description: 'Bouclier global puissant.',
    type: 'defense',
    cost: { metal: 50000, crystal: 50000, deuterium: 0 },
    attack: 1, shield: 10000, hull: 100000,
    prerequisites: {
      buildings: { shipyard: 6 },
      research: { shieldingTech: 6 },
    },
  },
  interplanetaryMissile: {
    id: 'interplanetaryMissile',
    name: 'Missile Interplanetaire',
    description: 'Attaque a distance les defenses ennemies.',
    type: 'defense',
    cost: { metal: 12500, crystal: 2500, deuterium: 10000 },
    attack: 12000, shield: 1, hull: 15000,
    prerequisites: {
      buildings: { shipyard: 4, missileSilo: 4 },
      research: { impulseDrive: 1 },
    },
  },
  antiBallisticMissile: {
    id: 'antiBallisticMissile',
    name: 'Missile Antibalistique',
    description: 'Intercepte les missiles ennemis.',
    type: 'defense',
    cost: { metal: 8000, crystal: 0, deuterium: 2000 },
    attack: 1, shield: 1, hull: 8000,
    prerequisites: {
      buildings: { missileSilo: 2 },
    },
  },
};
