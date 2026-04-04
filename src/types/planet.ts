import type { Resources, ResourceStorage } from './resource';
import type { BuildingType } from './building';
import type { ShipType, DefenseType } from './fleet';

export type Biome = 'glacial' | 'tundra' | 'temperate' | 'arid' | 'volcanic';

export interface Coordinates {
  galaxy: number;   // 1-9
  system: number;   // 1-499
  position: number; // 1-15
}

export interface Moon {
  id: string;
  name: string;
  size: number; // 1-8 (cases)
  buildings: Partial<Record<'lunarBase' | 'sensorPhalanx' | 'jumpGate', number>>;
  ships: Partial<Record<ShipType, number>>;
  defenses: Partial<Record<DefenseType, number>>;
}

export interface Planet {
  id: string;
  name: string;
  coordinates: Coordinates;
  size: number;          // 4-12 (nombre de cases)
  temperature: number;   // en degres Celsius
  biome: Biome;
  aquaticity: number;    // 0-1, ratio eau/terre
  resources: Resources;
  storage: ResourceStorage;
  buildings: Record<BuildingType, number>; // type -> niveau
  ships: Partial<Record<ShipType, number>>;
  defenses: Partial<Record<DefenseType, number>>;
  moon?: Moon;
}

export function getBiome(temperature: number): Biome {
  if (temperature < -50) return 'glacial';
  if (temperature < 0) return 'tundra';
  if (temperature < 30) return 'temperate';
  if (temperature < 70) return 'arid';
  return 'volcanic';
}
