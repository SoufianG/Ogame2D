import type { Resources } from './resource';

// Mines & Production
export type MineBuilding =
  | 'metalMine'
  | 'crystalMine'
  | 'deuteriumSynthesizer'
  | 'solarPlant'
  | 'fusionReactor';

// Stockage
export type StorageBuilding =
  | 'metalStorage'
  | 'crystalStorage'
  | 'deuteriumTank';

// Infrastructure
export type InfrastructureBuilding =
  | 'roboticsFactory'
  | 'shipyard'
  | 'researchLab'
  | 'allianceDepot'
  | 'terraformer'
  | 'missileSilo';

// Lunaire
export type LunarBuilding =
  | 'lunarBase'
  | 'sensorPhalanx'
  | 'jumpGate';

export type BuildingType =
  | MineBuilding
  | StorageBuilding
  | InfrastructureBuilding
  | LunarBuilding;

export interface BuildingInfo {
  id: BuildingType;
  name: string;
  description: string;
  baseCost: Resources;
  costFactor: number; // multiplicateur par niveau (generalement 1.5 ou 2)
}
