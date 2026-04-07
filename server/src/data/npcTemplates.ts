// Templates PNJ : 10 niveaux de difficulte
// Chaque niveau definit ressources, defenses, vaisseaux et tech

export interface NpcTemplate {
  level: number;
  resources: { metal: number; crystal: number; deuterium: number };
  defenses: Record<string, number>;
  ships: Record<string, number>;
  tech: { weaponsTech: number; shieldingTech: number; armourTech: number };
}

export const NPC_TEMPLATES: NpcTemplate[] = [
  {
    level: 1,
    resources: { metal: 5000, crystal: 3000, deuterium: 0 },
    defenses: { rocketLauncher: 5 },
    ships: {},
    tech: { weaponsTech: 0, shieldingTech: 0, armourTech: 0 },
  },
  {
    level: 2,
    resources: { metal: 15000, crystal: 8000, deuterium: 1000 },
    defenses: { rocketLauncher: 10, lightLaser: 3 },
    ships: {},
    tech: { weaponsTech: 1, shieldingTech: 0, armourTech: 0 },
  },
  {
    level: 3,
    resources: { metal: 40000, crystal: 20000, deuterium: 5000 },
    defenses: { rocketLauncher: 15, lightLaser: 8, heavyLaser: 2 },
    ships: { lightFighter: 5 },
    tech: { weaponsTech: 2, shieldingTech: 1, armourTech: 1 },
  },
  {
    level: 4,
    resources: { metal: 80000, crystal: 45000, deuterium: 15000 },
    defenses: { rocketLauncher: 20, lightLaser: 15, heavyLaser: 5, smallShieldDome: 1 },
    ships: { lightFighter: 10, heavyFighter: 3 },
    tech: { weaponsTech: 3, shieldingTech: 2, armourTech: 2 },
  },
  {
    level: 5,
    resources: { metal: 150000, crystal: 80000, deuterium: 30000 },
    defenses: { rocketLauncher: 30, lightLaser: 20, heavyLaser: 10, gaussCannon: 2, smallShieldDome: 1 },
    ships: { lightFighter: 15, heavyFighter: 8, cruiser: 3 },
    tech: { weaponsTech: 4, shieldingTech: 3, armourTech: 3 },
  },
  {
    level: 6,
    resources: { metal: 300000, crystal: 160000, deuterium: 60000 },
    defenses: { rocketLauncher: 40, lightLaser: 25, heavyLaser: 15, gaussCannon: 5, ionCannon: 3, smallShieldDome: 1, largeShieldDome: 1 },
    ships: { heavyFighter: 10, cruiser: 8, battleship: 2 },
    tech: { weaponsTech: 5, shieldingTech: 4, armourTech: 4 },
  },
  {
    level: 7,
    resources: { metal: 500000, crystal: 280000, deuterium: 120000 },
    defenses: { rocketLauncher: 50, lightLaser: 30, heavyLaser: 20, gaussCannon: 8, ionCannon: 5, plasmaTurret: 1, smallShieldDome: 1, largeShieldDome: 1 },
    ships: { cruiser: 5, battleship: 5, bomber: 2 },
    tech: { weaponsTech: 6, shieldingTech: 5, armourTech: 5 },
  },
  {
    level: 8,
    resources: { metal: 800000, crystal: 450000, deuterium: 200000 },
    defenses: { rocketLauncher: 60, lightLaser: 40, heavyLaser: 25, gaussCannon: 12, ionCannon: 8, plasmaTurret: 3, smallShieldDome: 1, largeShieldDome: 1 },
    ships: { battleship: 10, bomber: 5, destroyer: 2 },
    tech: { weaponsTech: 7, shieldingTech: 6, armourTech: 6 },
  },
  {
    level: 9,
    resources: { metal: 1200000, crystal: 700000, deuterium: 350000 },
    defenses: { rocketLauncher: 80, lightLaser: 50, heavyLaser: 30, gaussCannon: 15, ionCannon: 10, plasmaTurret: 5, smallShieldDome: 1, largeShieldDome: 1 },
    ships: { battleship: 15, bomber: 8, destroyer: 5 },
    tech: { weaponsTech: 8, shieldingTech: 7, armourTech: 7 },
  },
  {
    level: 10,
    resources: { metal: 2000000, crystal: 1200000, deuterium: 600000 },
    defenses: { rocketLauncher: 100, lightLaser: 60, heavyLaser: 40, gaussCannon: 20, ionCannon: 15, plasmaTurret: 8, smallShieldDome: 1, largeShieldDome: 1 },
    ships: { battleship: 20, bomber: 10, destroyer: 8 },
    tech: { weaponsTech: 10, shieldingTech: 9, armourTech: 9 },
  },
];

// RNG deterministe (meme algo que le client)
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

const POSITION_COUNT = 15;

const NPC_NAMES = [
  'Kronos VII', 'Nebula Prime', 'Arcadia', 'Helios Station',
  'Tartarus', 'Elysium', 'Pandora', 'Olympus',
  'Vega IX', 'Sirius B', 'Antares', 'Rigel',
  'Proxima', 'Kepler', 'Atlas', 'Titan',
  'Europa', 'Callisto', 'Ganymede', 'Io',
];

// Determine si une position est un slot PNJ (replique la logique client de universe.ts)
export function isNpcSlot(galaxy: number, system: number, position: number): boolean {
  const seed = galaxy * 10000 + system;
  const rand = seededRandom(seed);

  // Rejouer le RNG pour chaque position jusqu'a la notre
  // La boucle dans universe.ts consomme le RNG dans un ordre precis
  // On doit reproduire exactement cet ordre
  const starRand = rand(); // consomme pour le starType

  for (let pos = 1; pos <= POSITION_COUNT; pos++) {
    const hasPlanet = rand() > 0.25;
    if (hasPlanet) {
      const isNpc = rand() > 0.7;
      const _nameIdx = rand(); // consomme pour nameIdx
      // randomSize() utilise Math.random(), pas le seeded random — pas de consommation
      // aquaticity consomme le rand
      const _aqua = rand();
      const _moon = rand();
      const _debris = rand();
      if (rand() <= 0.1) {
        // debris values
        rand(); // metal
        rand(); // crystal
      }

      if (pos === position) return isNpc;
    } else {
      if (pos === position) return false;
    }
  }
  return false;
}

// Determine le niveau PNJ pour une position (biais par zone de systeme)
export function getNpcLevel(galaxy: number, system: number, position: number): number {
  const seed = galaxy * 150000 + system * 100 + position;
  const rand = seededRandom(seed);
  const r = rand();

  // Biais progressif par zone
  let minLevel: number, maxLevel: number;
  if (system <= 10) {
    minLevel = 1; maxLevel = 4;
  } else if (system <= 25) {
    minLevel = 3; maxLevel = 6;
  } else if (system <= 40) {
    minLevel = 5; maxLevel = 8;
  } else {
    minLevel = 7; maxLevel = 10;
  }

  return minLevel + Math.floor(r * (maxLevel - minLevel + 1));
}

// Nom deterministe du PNJ
export function getNpcName(galaxy: number, system: number, position: number): string {
  const seed = galaxy * 10000 + system;
  const rand = seededRandom(seed);
  rand(); // starType

  for (let pos = 1; pos <= POSITION_COUNT; pos++) {
    const hasPlanet = rand() > 0.25;
    if (hasPlanet) {
      const isNpc = rand() > 0.7;
      const nameIdx = Math.floor(rand() * NPC_NAMES.length);
      const _aqua = rand();
      const _moon = rand();
      const _debris = rand();
      if (rand() <= 0.1) { rand(); rand(); }

      if (pos === position && isNpc) {
        return `${NPC_NAMES[nameIdx]} ${system}-${pos}`;
      }
    }
  }
  return `PNJ ${galaxy}:${system}:${position}`;
}

export function getNpcTemplate(level: number): NpcTemplate {
  return NPC_TEMPLATES[Math.max(0, Math.min(level - 1, 9))];
}
