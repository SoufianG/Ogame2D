import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Planet, Resources } from '../types';
import type { BuildingType } from '../types/building';
import type { ResearchType } from '../types/research';
import type { ShipType, DefenseType, FleetMovement, MissionType } from '../types/fleet';
import type { CombatResult } from '../engine/combat';
import {
  apiBuild,
  apiCancelBuild,
  apiStartResearch,
  apiCancelResearch,
  apiSendFleet,
} from '../api/sync';
import { apiPut, apiDelete } from '../api/client';

// === Types de file ===
export interface BuildingQueueItem {
  building: BuildingType;
  targetLevel: number;
  remainingTime: number; // secondes
  totalTime: number;     // secondes
}

export interface ResearchQueueItem {
  research: ResearchType;
  targetLevel: number;
  remainingTime: number;
  totalTime: number;
  planetId: string;
}

export interface ShipyardQueueItem {
  id: number;
  unitType: string;
  unitCategory: 'ship' | 'defense';
  quantity: number;
  remaining: number;
  unitTime: number;   // secondes par unite
  elapsed: number;    // secondes ecoulees sur l'unite en cours
}

// === Messages ===
export type MessageType = 'combat' | 'espionage' | 'transport' | 'colonization' | 'system';

export interface GameMessage {
  id: string;
  type: MessageType;
  timestamp: number;
  title: string;
  read: boolean;
  combatResult?: CombatResult;
  espionageReport?: {
    planetName: string;
    coordinates: { galaxy: number; system: number; position: number };
    resources: { metal: number; crystal: number; deuterium: number };
    ships?: Partial<Record<ShipType, number>>;
    defenses?: Partial<Record<DefenseType, number>>;
    research?: Partial<Record<ResearchType, number>>;
  };
  body?: string;
}

interface GameState {
  planets: Planet[];
  currentPlanetId: string | null;
  research: Record<ResearchType, number>;
  effectiveLab: number;
  buildingQueues: Record<string, BuildingQueueItem | null>;
  researchQueue: ResearchQueueItem | null;
  shipyardQueues: Record<string, ShipyardQueueItem[]>;
  fleetMovements: FleetMovement[];
  messages: GameMessage[];

  // Cible de flotte preremplie (depuis la galaxie)
  pendingFleetTarget: {
    destination: { galaxy: number; system: number; position: number };
    mission: MissionType;
  } | null;
  setPendingFleetTarget: (target: GameState['pendingFleetTarget']) => void;

  // Destinataire de message preremplie
  pendingMessageTo: { username: string; userId: string } | null;
  setPendingMessageTo: (target: GameState['pendingMessageTo']) => void;

  // Getters
  currentPlanet: () => Planet | undefined;

  // Actions locales (UI)
  setCurrentPlanet: (id: string) => void;
  updateResources: (planetId: string, resources: Partial<Resources>) => void;

  // Tick local (decrementer les timers pour l'affichage entre deux polls serveur)
  tickTimers: () => void;

  // Actions serveur (appellent l'API)
  startBuilding: (planetId: string, building: BuildingType) => Promise<boolean>;
  cancelBuilding: (planetId: string) => Promise<boolean>;
  startResearch: (planetId: string, research: ResearchType) => Promise<boolean>;
  cancelResearch: () => Promise<boolean>;
  sendFleet: (
    originPlanetId: string,
    destination: { galaxy: number; system: number; position: number },
    ships: Partial<Record<ShipType, number>>,
    mission: MissionType,
    speed: number,
    cargo?: { metal: number; crystal: number; deuterium: number },
  ) => Promise<boolean>;

  // Messages (API)
  markMessageRead: (id: string) => void;
  deleteMessage: (id: string) => void;

  // Missiles (local pour l'instant)
  launchMissile: (
    originPlanetId: string,
    destination: { galaxy: number; system: number; position: number },
    count: number,
  ) => boolean;
}

const defaultResearch: Record<ResearchType, number> = {
  espionageTech: 0,
  computerTech: 0,
  weaponsTech: 0,
  shieldingTech: 0,
  armourTech: 0,
  combustionDrive: 0,
  impulseDrive: 0,
  hyperspaceDrive: 0,
  energyTech: 0,
  laserTech: 0,
  ionTech: 0,
  plasmaTech: 0,
  intergalacticResearchNetwork: 0,
  astrophysics: 0,
  gravitonTech: 0,
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      planets: [],
      currentPlanetId: null,
      research: { ...defaultResearch },
      effectiveLab: 0,
      buildingQueues: {},
      researchQueue: null,
      shipyardQueues: {},
      fleetMovements: [],
      messages: [],
      pendingFleetTarget: null,
      pendingMessageTo: null,
      setPendingFleetTarget: (target) => set({ pendingFleetTarget: target }),
      setPendingMessageTo: (target) => set({ pendingMessageTo: target }),

      currentPlanet: () => {
        const { planets, currentPlanetId } = get();
        return planets.find((p) => p.id === currentPlanetId);
      },

      setCurrentPlanet: (id) => set({ currentPlanetId: id }),

      updateResources: (planetId, resources) =>
        set((state) => ({
          planets: state.planets.map((p) =>
            p.id === planetId
              ? { ...p, resources: { ...p.resources, ...resources } }
              : p
          ),
        })),

      // Decrementer les timers localement (1s) pour un affichage fluide entre les polls
      tickTimers: () => {
        const state = get();

        const newQueues = { ...state.buildingQueues };
        for (const [planetId, queue] of Object.entries(newQueues)) {
          if (!queue) continue;
          newQueues[planetId] = { ...queue, remainingTime: Math.max(0, queue.remainingTime - 1) };
        }

        let newResearchQueue = state.researchQueue;
        if (newResearchQueue) {
          newResearchQueue = { ...newResearchQueue, remainingTime: Math.max(0, newResearchQueue.remainingTime - 1) };
        }

        set({
          buildingQueues: newQueues,
          researchQueue: newResearchQueue,
        });
      },

      // === Actions serveur ===
      startBuilding: async (planetId, building) => {
        return apiBuild(planetId, building);
      },

      cancelBuilding: async (planetId) => {
        return apiCancelBuild(planetId);
      },

      startResearch: async (planetId, research) => {
        return apiStartResearch(planetId, research);
      },

      cancelResearch: async () => {
        return apiCancelResearch();
      },

      sendFleet: async (originPlanetId, destination, ships, mission, speed, cargo) => {
        return apiSendFleet(originPlanetId, destination, ships, mission, speed, cargo);
      },

      // === Messages ===
      markMessageRead: (id) => {
        set((s) => ({
          messages: s.messages.map((m) => (m.id === id ? { ...m, read: true } : m)),
        }));
        apiPut(`/game/messages/${id}/read`, {}).catch(() => {});
      },

      deleteMessage: (id) => {
        set((s) => ({
          messages: s.messages.filter((m) => m.id !== id),
        }));
        apiDelete(`/game/messages/${id}`).catch(() => {});
      },

      // === Missiles (local simplifie pour l'instant) ===
      launchMissile: (originPlanetId, destination, count) => {
        const state = get();
        const planet = state.planets.find((p) => p.id === originPlanetId);
        if (!planet) return false;

        const available = planet.defenses.interplanetaryMissile || 0;
        if (available < count) return false;

        const siloLevel = planet.buildings.missileSilo;
        const range = siloLevel * 5;
        if (destination.galaxy !== planet.coordinates.galaxy) return false;
        if (Math.abs(destination.system - planet.coordinates.system) > range) return false;

        const damagePerMissile = 12000 * (1 + 0.1 * (state.research.weaponsTech || 0));
        const totalDamage = damagePerMissile * count;

        const newDefenses = { ...planet.defenses };
        newDefenses.interplanetaryMissile = available - count;
        if (newDefenses.interplanetaryMissile <= 0) delete newDefenses.interplanetaryMissile;

        const now = Date.now();

        set((s) => ({
          planets: s.planets.map((p) =>
            p.id === originPlanetId ? { ...p, defenses: newDefenses } : p
          ),
          messages: [...s.messages, {
            id: `msg-${now}-${Math.random().toString(36).slice(2, 8)}`,
            type: 'combat' as const,
            timestamp: now,
            title: `Missile IP [${destination.galaxy}:${destination.system}:${destination.position}]`,
            read: false,
            body: `${count} missile${count > 1 ? 's' : ''} interplanetaire${count > 1 ? 's' : ''} lance${count > 1 ? 's' : ''} pour ${totalDamage} degats totaux sur les defenses ennemies.`,
          }],
        }));

        return true;
      },
    }),
    {
      name: 'ogame2d-save',
      partialize: (state) => ({
        planets: state.planets,
        currentPlanetId: state.currentPlanetId,
        research: state.research,
        effectiveLab: state.effectiveLab,
        buildingQueues: state.buildingQueues,
        researchQueue: state.researchQueue,
        shipyardQueues: state.shipyardQueues,
        fleetMovements: state.fleetMovements,
        messages: state.messages,
      }),
    },
  ),
);
