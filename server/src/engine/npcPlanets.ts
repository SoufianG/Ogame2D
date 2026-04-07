// Gestion des planetes PNJ : creation paresseuse et regeneration
import type Database from 'better-sqlite3';
import { isNpcSlot, getNpcLevel, getNpcName, getNpcTemplate } from '../data/npcTemplates.js';

const POSITION_COUNT = 15;
const REGEN_SECONDS = 86400; // 24h pour regeneration complete des ressources
const DEFENSE_RESET_SECONDS = 172800; // 48h pour reset des defenses si totalement detruites

export interface NpcPlanetRow {
  id: string;
  user_id: string;
  name: string;
  galaxy: number;
  system: number;
  position: number;
  size: number;
  temperature: number;
  biome: string;
  metal: number;
  crystal: number;
  deuterium: number;
  buildings: string;
  ships: string;
  defenses: string;
  is_npc: number;
  npc_level: number | null;
  last_pillaged: number | null;
}

function temperatureForPosition(position: number): number {
  return Math.floor(140 - (position / POSITION_COUNT) * 240);
}

function biomeFromTemp(temp: number): string {
  if (temp > 80) return 'volcanic';
  if (temp > 40) return 'arid';
  if (temp > 0) return 'temperate';
  if (temp > -40) return 'tundra';
  return 'glacial';
}

// Cree une planete PNJ en DB si elle devrait exister (slot PNJ) et n'existe pas encore
export function ensureNpcPlanet(
  db: Database.Database,
  galaxy: number,
  system: number,
  position: number,
): NpcPlanetRow | null {
  // Verifier si une planete existe deja a cette position
  const existing = db.prepare(
    'SELECT * FROM planets WHERE galaxy = ? AND system = ? AND position = ?',
  ).get(galaxy, system, position) as NpcPlanetRow | undefined;

  if (existing) return existing;

  // Verifier si c'est un slot PNJ
  if (!isNpcSlot(galaxy, system, position)) return null;

  const level = getNpcLevel(galaxy, system, position);
  const template = getNpcTemplate(level);
  const name = getNpcName(galaxy, system, position);
  const temp = temperatureForPosition(position);
  const biome = biomeFromTemp(temp);
  const size = 8;
  const planetId = `npc-${galaxy}-${system}-${position}`;

  db.prepare(`
    INSERT INTO planets (id, user_id, name, galaxy, system, position, size, temperature, biome, aquaticity,
      metal, crystal, deuterium, buildings, ships, defenses, is_npc, npc_level, last_pillaged)
    VALUES (?, 'npc', ?, ?, ?, ?, ?, ?, ?, 0.3, ?, ?, ?, '{}', ?, ?, 1, ?, NULL)
  `).run(
    planetId, name, galaxy, system, position, size, temp, biome,
    template.resources.metal, template.resources.crystal, template.resources.deuterium,
    JSON.stringify(template.ships), JSON.stringify(template.defenses),
    level,
  );

  return db.prepare(
    'SELECT * FROM planets WHERE id = ?',
  ).get(planetId) as NpcPlanetRow;
}

// Cree tous les PNJ d'un systeme (utilise par la galaxy view)
export function ensureNpcSystem(db: Database.Database, galaxy: number, system: number): void {
  const txn = db.transaction(() => {
    for (let pos = 1; pos <= POSITION_COUNT; pos++) {
      ensureNpcPlanet(db, galaxy, system, pos);
    }
  });
  txn();
}

// Regenere les ressources et defenses d'un PNJ de facon paresseuse
// Met a jour la DB et retourne la planete a jour
export function regenerateNpcPlanet(
  db: Database.Database,
  planet: NpcPlanetRow,
  now: number,
): NpcPlanetRow {
  if (!planet.is_npc || planet.npc_level === null) return planet;

  const template = getNpcTemplate(planet.npc_level);

  // Si jamais pille, ressources deja au max (cas premiere creation)
  if (planet.last_pillaged === null) return planet;

  const elapsed = now - planet.last_pillaged;
  const ratio = Math.min(1, elapsed / REGEN_SECONDS);

  const newMetal = Math.min(
    template.resources.metal,
    planet.metal + template.resources.metal * ratio,
  );
  const newCrystal = Math.min(
    template.resources.crystal,
    planet.crystal + template.resources.crystal * ratio,
  );
  const newDeut = Math.min(
    template.resources.deuterium,
    planet.deuterium + template.resources.deuterium * ratio,
  );

  // Reset defenses/vaisseaux apres 48h si tout est detruit
  let newShips = planet.ships;
  let newDefenses = planet.defenses;
  if (elapsed >= DEFENSE_RESET_SECONDS) {
    const currentDef = JSON.parse(planet.defenses) as Record<string, number>;
    const currentShips = JSON.parse(planet.ships) as Record<string, number>;
    const defTotal = Object.values(currentDef).reduce((s, v) => s + v, 0);
    const shipTotal = Object.values(currentShips).reduce((s, v) => s + v, 0);
    if (defTotal === 0 && shipTotal === 0) {
      newDefenses = JSON.stringify(template.defenses);
      newShips = JSON.stringify(template.ships);
    }
  }

  db.prepare(
    'UPDATE planets SET metal = ?, crystal = ?, deuterium = ?, ships = ?, defenses = ? WHERE id = ?',
  ).run(newMetal, newCrystal, newDeut, newShips, newDefenses, planet.id);

  return {
    ...planet,
    metal: newMetal,
    crystal: newCrystal,
    deuterium: newDeut,
    ships: newShips,
    defenses: newDefenses,
  };
}
