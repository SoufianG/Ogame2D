import type { Resources } from '../types';
import type { ResearchType } from '../types/research';
import type { BuildingType } from '../types/building';

export interface ResearchData {
  id: ResearchType;
  name: string;
  description: string;
  category: 'basic' | 'propulsion' | 'advanced' | 'astrophysics';
  baseCost: Resources;
  costFactor: number;
  prerequisites: {
    buildings?: Partial<Record<BuildingType, number>>;
    research?: Partial<Record<ResearchType, number>>;
  };
}

export function getResearchCost(data: ResearchData, level: number): Resources {
  const factor = Math.pow(data.costFactor, level - 1);
  return {
    metal: Math.floor(data.baseCost.metal * factor),
    crystal: Math.floor(data.baseCost.crystal * factor),
    deuterium: Math.floor(data.baseCost.deuterium * factor),
  };
}

// Temps de recherche en secondes
// Formule : (metal + crystal) / (1000 * (1 + labLevel)) * 3600
export function getResearchTime(
  cost: Resources,
  labLevel: number,
): number {
  const base = (cost.metal + cost.crystal) / (1000 * (1 + labLevel));
  return Math.max(1, Math.floor(base * 3600));
}

export const RESEARCH_DATA: Record<ResearchType, ResearchData> = {
  // === TECHNOLOGIES DE BASE ===
  espionageTech: {
    id: 'espionageTech',
    name: 'Technologie Espionnage',
    description: 'Ameliore la qualite des rapports d\'espionnage.',
    category: 'basic',
    baseCost: { metal: 200, crystal: 1000, deuterium: 200 },
    costFactor: 2,
    prerequisites: {
      buildings: { researchLab: 3 },
    },
  },
  computerTech: {
    id: 'computerTech',
    name: 'Technologie Informatique',
    description: 'Augmente le nombre de flottes simultanees.',
    category: 'basic',
    baseCost: { metal: 0, crystal: 400, deuterium: 600 },
    costFactor: 2,
    prerequisites: {
      buildings: { researchLab: 1 },
    },
  },
  weaponsTech: {
    id: 'weaponsTech',
    name: 'Technologie d\'Armement',
    description: 'Bonus de +10% d\'attaque par niveau sur tous les vaisseaux.',
    category: 'basic',
    baseCost: { metal: 800, crystal: 200, deuterium: 0 },
    costFactor: 2,
    prerequisites: {
      buildings: { researchLab: 4 },
    },
  },
  shieldingTech: {
    id: 'shieldingTech',
    name: 'Technologie de Protection',
    description: 'Bonus de +10% de bouclier par niveau sur tous les vaisseaux.',
    category: 'basic',
    baseCost: { metal: 200, crystal: 600, deuterium: 0 },
    costFactor: 2,
    prerequisites: {
      buildings: { researchLab: 6 },
      research: { energyTech: 3 },
    },
  },
  armourTech: {
    id: 'armourTech',
    name: 'Technologie de Blindage',
    description: 'Bonus de +10% de coque par niveau sur tous les vaisseaux.',
    category: 'basic',
    baseCost: { metal: 1000, crystal: 0, deuterium: 0 },
    costFactor: 2,
    prerequisites: {
      buildings: { researchLab: 2 },
    },
  },

  // === PROPULSION ===
  combustionDrive: {
    id: 'combustionDrive',
    name: 'Propulsion a Reaction',
    description: 'Debloque les chasseurs legers et les transports.',
    category: 'propulsion',
    baseCost: { metal: 400, crystal: 0, deuterium: 600 },
    costFactor: 2,
    prerequisites: {
      buildings: { researchLab: 1 },
      research: { energyTech: 1 },
    },
  },
  impulseDrive: {
    id: 'impulseDrive',
    name: 'Propulsion a Impulsion',
    description: 'Debloque les croiseurs et les recycleurs.',
    category: 'propulsion',
    baseCost: { metal: 2000, crystal: 4000, deuterium: 600 },
    costFactor: 2,
    prerequisites: {
      buildings: { researchLab: 2 },
      research: { energyTech: 1 },
    },
  },
  hyperspaceDrive: {
    id: 'hyperspaceDrive',
    name: 'Propulsion Hyperespace',
    description: 'Debloque les vaisseaux capitaux et le Nexus de Saut.',
    category: 'propulsion',
    baseCost: { metal: 10000, crystal: 20000, deuterium: 6000 },
    costFactor: 2,
    prerequisites: {
      buildings: { researchLab: 7 },
      research: { energyTech: 5, shieldingTech: 5 },
    },
  },

  // === ENERGIE & SCIENCE ===
  energyTech: {
    id: 'energyTech',
    name: 'Technologie Energetique',
    description: 'Ameliore l\'efficacite du reacteur a fusion.',
    category: 'advanced',
    baseCost: { metal: 0, crystal: 800, deuterium: 400 },
    costFactor: 2,
    prerequisites: {
      buildings: { researchLab: 1 },
    },
  },
  laserTech: {
    id: 'laserTech',
    name: 'Physique des Lasers',
    description: 'Debloque les canons laser.',
    category: 'advanced',
    baseCost: { metal: 200, crystal: 100, deuterium: 0 },
    costFactor: 2,
    prerequisites: {
      buildings: { researchLab: 1 },
      research: { energyTech: 2 },
    },
  },
  ionTech: {
    id: 'ionTech',
    name: 'Technologie Ionique',
    description: 'Debloque les canons ioniques.',
    category: 'advanced',
    baseCost: { metal: 1000, crystal: 300, deuterium: 100 },
    costFactor: 2,
    prerequisites: {
      buildings: { researchLab: 4 },
      research: { energyTech: 4, laserTech: 5 },
    },
  },
  plasmaTech: {
    id: 'plasmaTech',
    name: 'Physique des Plasmas',
    description: 'Debloque les canons plasma, la defense ultime.',
    category: 'advanced',
    baseCost: { metal: 2000, crystal: 4000, deuterium: 1000 },
    costFactor: 2,
    prerequisites: {
      buildings: { researchLab: 4 },
      research: { energyTech: 8, laserTech: 10, ionTech: 5 },
    },
  },
  intergalacticResearchNetwork: {
    id: 'intergalacticResearchNetwork',
    name: 'Reseau Intergalactique',
    description: 'Synchronise les laboratoires entre planetes.',
    category: 'advanced',
    baseCost: { metal: 240000, crystal: 400000, deuterium: 160000 },
    costFactor: 2,
    prerequisites: {
      buildings: { researchLab: 10 },
      research: { computerTech: 8, hyperspaceDrive: 8 },
    },
  },

  // === ASTROPHYSIQUE ===
  astrophysics: {
    id: 'astrophysics',
    name: 'Astrophysique',
    description: 'Chaque 2 niveaux permet de coloniser une planete supplementaire.',
    category: 'astrophysics',
    baseCost: { metal: 4000, crystal: 8000, deuterium: 4000 },
    costFactor: 1.75,
    prerequisites: {
      buildings: { researchLab: 3 },
      research: { espionageTech: 4, impulseDrive: 3 },
    },
  },
  gravitonTech: {
    id: 'gravitonTech',
    name: 'Technologie Graviton',
    description: 'Debloque l\'Etoile de la Mort. Necessite 300 000 energie.',
    category: 'astrophysics',
    baseCost: { metal: 0, crystal: 0, deuterium: 0 },
    costFactor: 3,
    prerequisites: {
      buildings: { researchLab: 12 },
    },
  },
};

export const RESEARCH_CATEGORIES = [
  { key: 'basic' as const, label: 'Technologies de Base' },
  { key: 'propulsion' as const, label: 'Propulsion' },
  { key: 'advanced' as const, label: 'Energie & Science' },
  { key: 'astrophysics' as const, label: 'Astrophysique' },
] as const;

export function getResearchForCategory(category: string): ResearchData[] {
  return Object.values(RESEARCH_DATA).filter((r) => r.category === category);
}
