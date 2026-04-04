import type { Resources } from './resource';
import type { Coordinates } from './planet';

// Vaisseaux civils
export type CivilShip =
  | 'smallCargo'
  | 'largeCargo'
  | 'recycler'
  | 'espionageProbe'
  | 'solarSatellite'
  | 'colonyShip';

// Vaisseaux militaires
export type MilitaryShip =
  | 'lightFighter'
  | 'heavyFighter'
  | 'cruiser'
  | 'battleship'
  | 'bomber'
  | 'destroyer'
  | 'deathstar';

export type ShipType = CivilShip | MilitaryShip;

export type MissionType =
  | 'attack'
  | 'transport'
  | 'deploy'
  | 'espionage'
  | 'colonize'
  | 'recycle'
  | 'station'
  | 'missileAttack'
  | 'jumpGate';

export interface FleetMovement {
  id: string;
  ships: Partial<Record<ShipType, number>>;
  origin: Coordinates;
  destination: Coordinates;
  mission: MissionType;
  cargo: Resources;
  departureTime: number;  // timestamp
  arrivalTime: number;    // timestamp
  returnTime?: number;    // timestamp (si aller-retour)
  speed: number;          // 10-100 %
}

export interface ShipInfo {
  id: ShipType;
  name: string;
  cost: Resources;
  attack: number;
  shield: number;
  hull: number;
  cargo: number;
  speed: number;
  fuelConsumption: number;
  rapidFire: Partial<Record<ShipType | DefenseType, number>>;
}

// Defenses
export type DefenseType =
  | 'rocketLauncher'
  | 'lightLaser'
  | 'heavyLaser'
  | 'gaussCannon'
  | 'ionCannon'
  | 'plasmaTurret'
  | 'smallShieldDome'
  | 'largeShieldDome'
  | 'interplanetaryMissile'
  | 'antiBallisticMissile';

export interface DefenseInfo {
  id: DefenseType;
  name: string;
  cost: Resources;
  attack: number;
  shield: number;
  hull: number;
}
