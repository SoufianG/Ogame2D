import type { Resources } from './resource';

export type ResearchType =
  // Technologies de base
  | 'espionageTech'
  | 'computerTech'
  | 'weaponsTech'
  | 'shieldingTech'
  | 'armourTech'
  // Propulsion
  | 'combustionDrive'
  | 'impulseDrive'
  | 'hyperspaceDrive'
  // Energie & Science
  | 'energyTech'
  | 'laserTech'
  | 'ionTech'
  | 'plasmaTech'
  | 'intergalacticResearchNetwork'
  // Astrophysique
  | 'astrophysics'
  | 'gravitonTech';

export interface ResearchInfo {
  id: ResearchType;
  name: string;
  description: string;
  baseCost: Resources;
  costFactor: number;
  prerequisites: Partial<Record<ResearchType, number>>;
}
