import { apiGet, apiPost } from './client';
import { useGameStore } from '../store/gameStore';
import type { Planet } from '../types';
import type { BuildingType } from '../types/building';
import type { ResearchType } from '../types/research';
import type { ShipType, MissionType } from '../types/fleet';
import { getBiome } from '../types/planet';
import type { BuildingQueueItem, ResearchQueueItem, ShipyardQueueItem, GameMessage } from '../store/gameStore';

// === Types de reponse serveur ===

interface ServerPlanet {
  id: string;
  name: string;
  galaxy: number;
  system: number;
  position: number;
  size: number;
  temperature: number;
  biome: string;
  aquaticity: number;
  metal: number;
  crystal: number;
  deuterium: number;
  buildings: Record<string, number>;
  ships: Record<string, number>;
  defenses: Record<string, number>;
  production: {
    metalPerHour: number;
    crystalPerHour: number;
    deuteriumPerHour: number;
    efficiency: number;
  };
  storage: {
    metal: number;
    crystal: number;
    deuterium: number;
  };
  buildingQueues: Array<{
    id: number;
    building: string;
    targetLevel: number;
    remainingTime: number;
    totalTime: number;
  }>;
  shipyardQueues: Array<{
    id: number;
    unitType: string;
    unitCategory: string;
    quantity: number;
    remaining: number;
    unitTime: number;
    elapsed: number;
  }>;
}

interface ServerFleet {
  id: string;
  ships: Record<string, number>;
  origin: { galaxy: number; system: number; position: number };
  destination: { galaxy: number; system: number; position: number };
  mission: string;
  cargo: { metal: number; crystal: number; deuterium: number };
  departureTime: number;
  arrivalTime: number;
  returnTime: number | null;
}

interface ServerState {
  planets: ServerPlanet[];
  research: Record<string, number>;
  researchQueue: {
    planetId: string;
    research: string;
    targetLevel: number;
    remainingTime: number;
    totalTime: number;
  } | null;
  fleets: ServerFleet[];
}

// === Conversion serveur -> store ===

function serverPlanetToLocal(p: ServerPlanet): Planet {
  return {
    id: p.id,
    name: p.name,
    coordinates: { galaxy: p.galaxy, system: p.system, position: p.position },
    size: p.size,
    temperature: p.temperature,
    biome: getBiome(p.temperature),
    aquaticity: p.aquaticity,
    resources: { metal: p.metal, crystal: p.crystal, deuterium: p.deuterium },
    storage: p.storage,
    buildings: p.buildings as Planet['buildings'],
    ships: p.ships,
    defenses: p.defenses,
    moon: undefined,
  };
}

// === Refresh complet depuis le serveur ===

export async function refreshGameState(): Promise<boolean> {
  try {
    const data = await apiGet<ServerState>('/game/state');

    if (data.planets.length === 0) {
      // Premiere connexion : creer la planete de depart
      await apiPost('/planets', {});
      return refreshGameState();
    }

    const store = useGameStore.getState();

    // Construire les buildingQueues par planetId
    const buildingQueues: Record<string, BuildingQueueItem | null> = {};
    const shipyardQueues: Record<string, ShipyardQueueItem[]> = {};
    for (const p of data.planets) {
      if (p.buildingQueues.length > 0) {
        const q = p.buildingQueues[0];
        buildingQueues[p.id] = {
          building: q.building as BuildingType,
          targetLevel: q.targetLevel,
          remainingTime: q.remainingTime,
          totalTime: q.totalTime,
        };
      } else {
        buildingQueues[p.id] = null;
      }
      shipyardQueues[p.id] = p.shipyardQueues.map((q) => ({
        id: q.id,
        unitType: q.unitType,
        unitCategory: q.unitCategory as 'ship' | 'defense',
        quantity: q.quantity,
        remaining: q.remaining,
        unitTime: q.unitTime,
        elapsed: q.elapsed,
      }));
    }

    // Research queue
    const researchQueue: ResearchQueueItem | null = data.researchQueue
      ? {
          research: data.researchQueue.research as ResearchType,
          targetLevel: data.researchQueue.targetLevel,
          remainingTime: data.researchQueue.remainingTime,
          totalTime: data.researchQueue.totalTime,
          planetId: data.researchQueue.planetId,
        }
      : null;

    // Fleets — convertir timestamps serveur (unix seconds) en ms
    const fleetMovements = data.fleets.map((f) => ({
      id: f.id,
      ships: f.ships as Partial<Record<ShipType, number>>,
      origin: f.origin,
      destination: f.destination,
      mission: f.mission as MissionType,
      cargo: f.cargo,
      departureTime: f.departureTime * 1000,
      arrivalTime: f.arrivalTime * 1000,
      returnTime: f.returnTime ? f.returnTime * 1000 : undefined,
      speed: 100,
    }));

    useGameStore.setState({
      planets: data.planets.map(serverPlanetToLocal),
      currentPlanetId: store.currentPlanetId && data.planets.some((p) => p.id === store.currentPlanetId)
        ? store.currentPlanetId
        : data.planets[0].id,
      research: { ...store.research, ...data.research } as Record<ResearchType, number>,
      buildingQueues,
      shipyardQueues,
      researchQueue,
      fleetMovements,
    });

    return true;
  } catch (err) {
    console.error('Failed to refresh game state:', err);
    return false;
  }
}

// === Actions API ===

export async function apiBuild(planetId: string, building: BuildingType): Promise<boolean> {
  try {
    await apiPost('/game/build', { planetId, building });
    await refreshGameState();
    return true;
  } catch (err) {
    console.error('Build failed:', err);
    return false;
  }
}

export async function apiCancelBuild(planetId: string): Promise<boolean> {
  try {
    await apiPost('/game/build/cancel', { planetId });
    await refreshGameState();
    return true;
  } catch (err) {
    console.error('Cancel build failed:', err);
    return false;
  }
}

export async function apiStartResearch(planetId: string, research: ResearchType): Promise<boolean> {
  try {
    await apiPost('/game/research/start', { planetId, research });
    await refreshGameState();
    return true;
  } catch (err) {
    console.error('Research failed:', err);
    return false;
  }
}

export async function apiCancelResearch(): Promise<boolean> {
  try {
    await apiPost('/game/research/cancel', {});
    await refreshGameState();
    return true;
  } catch (err) {
    console.error('Cancel research failed:', err);
    return false;
  }
}

export async function apiBuildUnit(planetId: string, unitType: string, quantity: number): Promise<boolean> {
  try {
    await apiPost('/game/shipyard/build', { planetId, unitType, quantity });
    await refreshGameState();
    return true;
  } catch (err) {
    console.error('Build unit failed:', err);
    return false;
  }
}

export async function apiCancelShipyardQueue(planetId: string, queueId: number): Promise<boolean> {
  try {
    await apiPost('/game/shipyard/cancel', { planetId, queueId });
    await refreshGameState();
    return true;
  } catch (err) {
    console.error('Cancel shipyard queue failed:', err);
    return false;
  }
}

export async function apiSendFleet(
  planetId: string,
  destination: { galaxy: number; system: number; position: number },
  ships: Partial<Record<ShipType, number>>,
  mission: MissionType,
  speed: number,
): Promise<boolean> {
  try {
    await apiPost('/game/fleet/send', { planetId, destination, ships, mission, speed });
    await refreshGameState();
    return true;
  } catch (err) {
    console.error('Send fleet failed:', err);
    return false;
  }
}

// === Messages API ===

export async function apiLoadMessages(): Promise<GameMessage[]> {
  try {
    const messages = await apiGet<Array<{
      id: string;
      type: string;
      title: string;
      body?: string;
      read: boolean;
      timestamp: number;
      espionageReport?: GameMessage['espionageReport'];
      combatResult?: GameMessage['combatResult'];
    }>>('/game/messages');

    return messages.map((m) => ({
      id: m.id,
      type: m.type as GameMessage['type'],
      title: m.title,
      body: m.body,
      read: m.read,
      timestamp: m.timestamp,
      espionageReport: m.espionageReport,
      combatResult: m.combatResult,
    }));
  } catch {
    return [];
  }
}
