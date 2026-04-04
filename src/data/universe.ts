import type { Biome, Coordinates } from '../types';
import { getBiome } from '../types/planet';

export const GALAXY_COUNT = 1;
export const SYSTEM_COUNT = 50;
export const POSITION_COUNT = 15;

// Temperature selon la position dans le systeme (plus proche = plus chaud)
function temperatureForPosition(position: number): number {
  // Position 1 = tres chaud (~120°C), position 15 = tres froid (~-80°C)
  const base = 140 - (position / POSITION_COUNT) * 240;
  return Math.floor(base + (Math.random() - 0.5) * 30);
}

// Taille aleatoire de planete
function randomSize(): number {
  return Math.floor(Math.random() * 9) + 4; // 4-12
}

export interface SystemSlot {
  position: number;
  planet: SlotPlanet | null;
  moon: boolean;
  debris: { metal: number; crystal: number } | null;
}

export interface SlotPlanet {
  name: string;
  size: number;
  temperature: number;
  biome: Biome;
  aquaticity: number;
  playerId: string | null; // null = planete libre/NPC
  playerName: string | null;
}

export interface SolarSystem {
  galaxy: number;
  system: number;
  slots: SystemSlot[];
  // Type d'etoile pour varier le visuel
  starType: 'yellow' | 'red' | 'blue' | 'orange' | 'white';
}

// RNG deterministe pour la generation
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

const STAR_TYPES: SolarSystem['starType'][] = ['yellow', 'red', 'blue', 'orange', 'white'];

const NPC_NAMES = [
  'Kronos VII', 'Nebula Prime', 'Arcadia', 'Helios Station',
  'Tartarus', 'Elysium', 'Pandora', 'Olympus',
  'Vega IX', 'Sirius B', 'Antares', 'Rigel',
  'Proxima', 'Kepler', 'Atlas', 'Titan',
  'Europa', 'Callisto', 'Ganymede', 'Io',
];

export function generateSystem(galaxy: number, system: number): SolarSystem {
  const seed = galaxy * 10000 + system;
  const rand = seededRandom(seed);

  const starType = STAR_TYPES[Math.floor(rand() * STAR_TYPES.length)];

  const slots: SystemSlot[] = [];
  for (let pos = 1; pos <= POSITION_COUNT; pos++) {
    const hasPlanet = rand() > 0.25; // 75% de chance d'avoir une planete

    if (hasPlanet) {
      const temp = temperatureForPosition(pos);
      // Chance qu'un NPC occupe la planete (30%)
      const isNpc = rand() > 0.7;
      const nameIdx = Math.floor(rand() * NPC_NAMES.length);

      slots.push({
        position: pos,
        planet: {
          name: isNpc
            ? `${NPC_NAMES[nameIdx]} ${system}-${pos}`
            : `Planete ${galaxy}:${system}:${pos}`,
          size: randomSize(),
          temperature: temp,
          biome: getBiome(temp),
          aquaticity: rand() * 0.7 + 0.05,
          playerId: isNpc ? `npc-${seed}-${pos}` : null,
          playerName: isNpc ? `Empire ${nameIdx + 1}` : null,
        },
        moon: rand() > 0.85, // 15% de chance d'avoir une lune
        debris: rand() > 0.9 // 10% de chance d'avoir un champ de debris
          ? { metal: Math.floor(rand() * 50000), crystal: Math.floor(rand() * 30000) }
          : null,
      });
    } else {
      slots.push({
        position: pos,
        planet: null,
        moon: false,
        debris: null,
      });
    }
  }

  return { galaxy, system, slots, starType };
}

// Cache des systemes generes
const systemCache = new Map<string, SolarSystem>();

export function getSystem(galaxy: number, system: number): SolarSystem {
  const key = `${galaxy}:${system}`;
  if (!systemCache.has(key)) {
    systemCache.set(key, generateSystem(galaxy, system));
  }
  return systemCache.get(key)!;
}

// Injecter la planete du joueur dans le systeme
export function placePlayerPlanet(
  coords: Coordinates,
  planetName: string,
  size: number,
  temperature: number,
  biome: Biome,
  aquaticity: number,
  hasMoon: boolean,
) {
  const sys = getSystem(coords.galaxy, coords.system);
  const slot = sys.slots.find((s) => s.position === coords.position);
  if (slot) {
    slot.planet = {
      name: planetName,
      size,
      temperature,
      biome,
      aquaticity,
      playerId: 'player',
      playerName: 'Vous',
    };
    slot.moon = hasMoon;
  }
}

