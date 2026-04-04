import type { Resources } from '../types';
import type { BuildingType } from '../types/building';
import type { ResearchType } from '../types/research';

export interface BuildingData {
  id: BuildingType;
  name: string;
  description: string;
  category: 'mine' | 'storage' | 'infrastructure' | 'lunar';
  baseCost: Resources;
  costFactor: number;
  // Prerequis : batiments et/ou recherches requis
  prerequisites: {
    buildings?: Partial<Record<BuildingType, number>>;
    research?: Partial<Record<ResearchType, number>>;
  };
}

// Cout au niveau N = baseCost * costFactor^(N-1)
export function getBuildingCost(data: BuildingData, level: number): Resources {
  const factor = Math.pow(data.costFactor, level - 1);
  return {
    metal: Math.floor(data.baseCost.metal * factor),
    crystal: Math.floor(data.baseCost.crystal * factor),
    deuterium: Math.floor(data.baseCost.deuterium * factor),
  };
}

// Temps de construction en secondes
// Formule OGame : (metal + crystal) / (2500 * (1 + roboticsFactory)) * 3600
export function getBuildingTime(
  cost: Resources,
  roboticsLevel: number,
): number {
  const base = (cost.metal + cost.crystal) / (2500 * (1 + roboticsLevel));
  return Math.max(1, Math.floor(base * 3600));
}

export const BUILDINGS_DATA: Record<BuildingType, BuildingData> = {
  // === MINES ===
  metalMine: {
    id: 'metalMine',
    name: 'Mine de Metal',
    description: 'Extrait du metal brut du sous-sol de la planete.',
    category: 'mine',
    baseCost: { metal: 60, crystal: 15, deuterium: 0 },
    costFactor: 1.5,
    prerequisites: {},
  },
  crystalMine: {
    id: 'crystalMine',
    name: 'Mine de Cristal',
    description: 'Extrait du cristal necessaire a la recherche et aux vaisseaux.',
    category: 'mine',
    baseCost: { metal: 48, crystal: 24, deuterium: 0 },
    costFactor: 1.6,
    prerequisites: {},
  },
  deuteriumSynthesizer: {
    id: 'deuteriumSynthesizer',
    name: 'Synthetiseur de Deuterium',
    description: 'Synthetise du deuterium, carburant essentiel pour les flottes.',
    category: 'mine',
    baseCost: { metal: 225, crystal: 75, deuterium: 0 },
    costFactor: 1.5,
    prerequisites: {},
  },
  solarPlant: {
    id: 'solarPlant',
    name: 'Centrale Solaire',
    description: 'Produit de l\'energie necessaire au fonctionnement des mines.',
    category: 'mine',
    baseCost: { metal: 75, crystal: 30, deuterium: 0 },
    costFactor: 1.5,
    prerequisites: {},
  },
  fusionReactor: {
    id: 'fusionReactor',
    name: 'Reacteur a Fusion',
    description: 'Produit de l\'energie en consommant du deuterium.',
    category: 'mine',
    baseCost: { metal: 900, crystal: 360, deuterium: 180 },
    costFactor: 1.8,
    prerequisites: {
      buildings: { deuteriumSynthesizer: 5 },
      research: { energyTech: 3 },
    },
  },

  // === STOCKAGE ===
  metalStorage: {
    id: 'metalStorage',
    name: 'Hangar de Metal',
    description: 'Augmente la capacite de stockage du metal.',
    category: 'storage',
    baseCost: { metal: 1000, crystal: 0, deuterium: 0 },
    costFactor: 2,
    prerequisites: {},
  },
  crystalStorage: {
    id: 'crystalStorage',
    name: 'Hangar de Cristal',
    description: 'Augmente la capacite de stockage du cristal.',
    category: 'storage',
    baseCost: { metal: 1000, crystal: 500, deuterium: 0 },
    costFactor: 2,
    prerequisites: {},
  },
  deuteriumTank: {
    id: 'deuteriumTank',
    name: 'Reservoir de Deuterium',
    description: 'Augmente la capacite de stockage du deuterium.',
    category: 'storage',
    baseCost: { metal: 1000, crystal: 1000, deuterium: 0 },
    costFactor: 2,
    prerequisites: {},
  },

  // === INFRASTRUCTURE ===
  roboticsFactory: {
    id: 'roboticsFactory',
    name: 'Usine de Robotique',
    description: 'Reduit le temps de construction de tous les batiments.',
    category: 'infrastructure',
    baseCost: { metal: 400, crystal: 120, deuterium: 200 },
    costFactor: 2,
    prerequisites: {},
  },
  shipyard: {
    id: 'shipyard',
    name: 'Chantier Naval',
    description: 'Permet la construction de vaisseaux et de defenses.',
    category: 'infrastructure',
    baseCost: { metal: 400, crystal: 200, deuterium: 100 },
    costFactor: 2,
    prerequisites: {
      buildings: { roboticsFactory: 2 },
    },
  },
  researchLab: {
    id: 'researchLab',
    name: 'Laboratoire de Recherche',
    description: 'Permet de debloquer et d\'ameliorer les technologies.',
    category: 'infrastructure',
    baseCost: { metal: 200, crystal: 400, deuterium: 200 },
    costFactor: 2,
    prerequisites: {},
  },
  allianceDepot: {
    id: 'allianceDepot',
    name: 'Depot d\'Alliance',
    description: 'Permet de stocker des ressources partagees avec l\'alliance.',
    category: 'infrastructure',
    baseCost: { metal: 20000, crystal: 40000, deuterium: 0 },
    costFactor: 2,
    prerequisites: {},
  },
  terraformer: {
    id: 'terraformer',
    name: 'Terraformeur',
    description: 'Augmente le nombre de cases disponibles sur la planete.',
    category: 'infrastructure',
    baseCost: { metal: 0, crystal: 50000, deuterium: 100000 },
    costFactor: 2,
    prerequisites: {
      buildings: { researchLab: 1 },
      research: { energyTech: 12 },
    },
  },
  missileSilo: {
    id: 'missileSilo',
    name: 'Silo a Missiles',
    description: 'Stocke les missiles interplanetaires et antibalistiques.',
    category: 'infrastructure',
    baseCost: { metal: 20000, crystal: 20000, deuterium: 1000 },
    costFactor: 2,
    prerequisites: {
      buildings: { shipyard: 1 },
    },
  },

  // === LUNAIRE ===
  lunarBase: {
    id: 'lunarBase',
    name: 'Base Lunaire',
    description: 'Batiment principal de la lune.',
    category: 'lunar',
    baseCost: { metal: 20000, crystal: 40000, deuterium: 20000 },
    costFactor: 2,
    prerequisites: {},
  },
  sensorPhalanx: {
    id: 'sensorPhalanx',
    name: 'Phaseur de Capteurs',
    description: 'Detecte les flottes ennemies en mouvement.',
    category: 'lunar',
    baseCost: { metal: 20000, crystal: 40000, deuterium: 20000 },
    costFactor: 2,
    prerequisites: {
      buildings: { lunarBase: 1 },
    },
  },
  jumpGate: {
    id: 'jumpGate',
    name: 'Nexus de Saut',
    description: 'Permet le deplacement instantane de flottes entre lunes.',
    category: 'lunar',
    baseCost: { metal: 2000000, crystal: 4000000, deuterium: 2000000 },
    costFactor: 2,
    prerequisites: {
      buildings: { lunarBase: 1 },
      research: { hyperspaceDrive: 7 },
    },
  },
};

// Ordre d'affichage par categorie
export const BUILDING_CATEGORIES = [
  { key: 'mine' as const, label: 'Production & Energie' },
  { key: 'storage' as const, label: 'Stockage' },
  { key: 'infrastructure' as const, label: 'Infrastructure' },
] as const;

export function getBuildingsForCategory(category: string): BuildingData[] {
  return Object.values(BUILDINGS_DATA).filter((b) => b.category === category);
}
