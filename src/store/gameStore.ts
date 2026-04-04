import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Planet, Resources } from '../types';
import type { BuildingType } from '../types/building';
import type { ResearchType } from '../types/research';
import type { ShipType, DefenseType, FleetMovement, MissionType } from '../types/fleet';
import { getBiome } from '../types/planet';
import { BUILDINGS_DATA, getBuildingCost, getBuildingTime } from '../data/buildings';
import { RESEARCH_DATA, getResearchCost, getResearchTime } from '../data/research';
import { SHIPS_DATA } from '../data/ships';
import { checkPrerequisites, canAfford } from '../utils/prerequisites';
import { formatNumber } from '../utils/format';
import { simulateCombat } from '../engine/combat';
import type { CombatInput, CombatResult } from '../engine/combat';
import { getSystem } from '../data/universe';

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
  planetId: string; // planete ou la recherche est lancee
}

export interface ShipyardQueueItem {
  unitType: ShipType | DefenseType;
  quantity: number;
  remainingTime: number;
  totalTime: number;
}

// === Messages ===
export type MessageType = 'combat' | 'espionage' | 'transport' | 'colonization' | 'system';

export interface GameMessage {
  id: string;
  type: MessageType;
  timestamp: number;
  title: string;
  read: boolean;
  // Combat report
  combatResult?: CombatResult;
  // Espionage report
  espionageReport?: {
    planetName: string;
    coordinates: { galaxy: number; system: number; position: number };
    resources: { metal: number; crystal: number; deuterium: number };
    ships?: Partial<Record<ShipType, number>>;
    defenses?: Partial<Record<DefenseType, number>>;
    research?: Partial<Record<ResearchType, number>>;
  };
  // General text
  body?: string;
}

interface GameState {
  // Planetes du joueur
  planets: Planet[];
  currentPlanetId: string | null;

  // Recherches globales (partagees entre planetes)
  research: Record<ResearchType, number>;

  // Files de construction (une par planete)
  buildingQueues: Record<string, BuildingQueueItem | null>;

  // File de recherche (globale, une seule a la fois)
  researchQueue: ResearchQueueItem | null;

  // Files de chantier naval (une par planete)
  shipyardQueues: Record<string, ShipyardQueueItem[]>;

  // Flottes en mouvement
  fleetMovements: FleetMovement[];

  // Messages / Rapports
  messages: GameMessage[];

  // Getters
  currentPlanet: () => Planet | undefined;

  // Actions
  setCurrentPlanet: (id: string) => void;
  updateResources: (planetId: string, resources: Partial<Resources>) => void;

  // Construction
  startBuilding: (planetId: string, building: BuildingType) => boolean;
  cancelBuilding: (planetId: string) => void;

  // Recherche
  startResearch: (planetId: string, research: ResearchType) => boolean;
  cancelResearch: () => void;

  // Flotte
  sendFleet: (
    originPlanetId: string,
    destination: { galaxy: number; system: number; position: number },
    ships: Partial<Record<ShipType, number>>,
    mission: MissionType,
    speed: number,
  ) => boolean;

  // Missiles
  launchMissile: (
    originPlanetId: string,
    destination: { galaxy: number; system: number; position: number },
    count: number,
  ) => boolean;

  // Messages
  markMessageRead: (id: string) => void;
  deleteMessage: (id: string) => void;

  // Tick (appele chaque seconde)
  tickConstructions: () => void;
}

function createStarterPlanet(): Planet {
  const temperature = Math.floor(Math.random() * 160) - 60;
  const size = Math.floor(Math.random() * 9) + 4;

  return {
    id: 'planet-1',
    name: 'Homeworld',
    coordinates: { galaxy: 1, system: 1, position: 8 },
    size,
    temperature,
    biome: getBiome(temperature),
    aquaticity: Math.random() * 0.6 + 0.1,
    resources: { metal: 500, crystal: 500, deuterium: 0 },
    storage: { metal: 10000, crystal: 10000, deuterium: 10000 },
    buildings: {
      metalMine: 0,
      crystalMine: 0,
      deuteriumSynthesizer: 0,
      solarPlant: 0,
      fusionReactor: 0,
      metalStorage: 0,
      crystalStorage: 0,
      deuteriumTank: 0,
      roboticsFactory: 0,
      shipyard: 0,
      researchLab: 0,
      allianceDepot: 0,
      terraformer: 0,
      missileSilo: 0,
      lunarBase: 0,
      sensorPhalanx: 0,
      jumpGate: 0,
    },
    ships: {},
    defenses: {},
    moon: undefined,
  };
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
    (set, get) => {
      const starterPlanet = createStarterPlanet();

      return {
        planets: [starterPlanet],
        currentPlanetId: starterPlanet.id,
        research: { ...defaultResearch },
        buildingQueues: {},
        researchQueue: null,
        shipyardQueues: {},
        fleetMovements: [],
        messages: [],

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

    // === CONSTRUCTION ===
    startBuilding: (planetId, building) => {
      const state = get();
      const planet = state.planets.find((p) => p.id === planetId);
      if (!planet) return false;

      // Deja en construction ?
      if (state.buildingQueues[planetId]) return false;

      const data = BUILDINGS_DATA[building];
      const nextLevel = planet.buildings[building] + 1;
      const cost = getBuildingCost(data, nextLevel);

      // Prerequis
      const missing = checkPrerequisites(data.prerequisites, planet, state.research);
      if (missing.length > 0) return false;

      // Ressources
      if (!canAfford(cost, planet.resources)) return false;

      // Cases disponibles (seulement si c'est un nouveau batiment)
      if (planet.buildings[building] === 0) {
        const usedSlots = Object.values(planet.buildings).filter((l) => l > 0).length;
        if (usedSlots >= planet.size) return false;
      }

      const time = getBuildingTime(cost, planet.buildings.roboticsFactory);

      set((s) => ({
        planets: s.planets.map((p) =>
          p.id === planetId
            ? {
                ...p,
                resources: {
                  metal: p.resources.metal - cost.metal,
                  crystal: p.resources.crystal - cost.crystal,
                  deuterium: p.resources.deuterium - cost.deuterium,
                },
              }
            : p
        ),
        buildingQueues: {
          ...s.buildingQueues,
          [planetId]: {
            building,
            targetLevel: nextLevel,
            remainingTime: time,
            totalTime: time,
          },
        },
      }));

      return true;
    },

    cancelBuilding: (planetId) => {
      const state = get();
      const queue = state.buildingQueues[planetId];
      if (!queue) return;

      const planet = state.planets.find((p) => p.id === planetId);
      if (!planet) return;

      // Remboursement partiel (50% des ressources)
      const data = BUILDINGS_DATA[queue.building];
      const cost = getBuildingCost(data, queue.targetLevel);

      set((s) => ({
        planets: s.planets.map((p) =>
          p.id === planetId
            ? {
                ...p,
                resources: {
                  metal: p.resources.metal + Math.floor(cost.metal * 0.5),
                  crystal: p.resources.crystal + Math.floor(cost.crystal * 0.5),
                  deuterium: p.resources.deuterium + Math.floor(cost.deuterium * 0.5),
                },
              }
            : p
        ),
        buildingQueues: {
          ...s.buildingQueues,
          [planetId]: null,
        },
      }));
    },

    // === RECHERCHE ===
    startResearch: (planetId, research) => {
      const state = get();
      const planet = state.planets.find((p) => p.id === planetId);
      if (!planet) return false;

      // Deja en recherche ?
      if (state.researchQueue) return false;

      // Besoin d'un labo
      if (planet.buildings.researchLab < 1) return false;

      const data = RESEARCH_DATA[research];
      const nextLevel = state.research[research] + 1;
      const cost = getResearchCost(data, nextLevel);

      // Prerequis
      const missing = checkPrerequisites(data.prerequisites, planet, state.research);
      if (missing.length > 0) return false;

      // Ressources
      if (!canAfford(cost, planet.resources)) return false;

      const time = getResearchTime(cost, planet.buildings.researchLab);

      set((s) => ({
        planets: s.planets.map((p) =>
          p.id === planetId
            ? {
                ...p,
                resources: {
                  metal: p.resources.metal - cost.metal,
                  crystal: p.resources.crystal - cost.crystal,
                  deuterium: p.resources.deuterium - cost.deuterium,
                },
              }
            : p
        ),
        researchQueue: {
          research,
          targetLevel: nextLevel,
          remainingTime: time,
          totalTime: time,
          planetId,
        },
      }));

      return true;
    },

    cancelResearch: () => {
      const state = get();
      const queue = state.researchQueue;
      if (!queue) return;

      const data = RESEARCH_DATA[queue.research];
      const cost = getResearchCost(data, queue.targetLevel);

      set((s) => ({
        planets: s.planets.map((p) =>
          p.id === queue.planetId
            ? {
                ...p,
                resources: {
                  metal: p.resources.metal + Math.floor(cost.metal * 0.5),
                  crystal: p.resources.crystal + Math.floor(cost.crystal * 0.5),
                  deuterium: p.resources.deuterium + Math.floor(cost.deuterium * 0.5),
                },
              }
            : p
        ),
        researchQueue: null,
      }));
    },

    // === FLOTTE ===
    sendFleet: (originPlanetId, destination, ships, mission, speed) => {
      const state = get();
      const planet = state.planets.find((p) => p.id === originPlanetId);
      if (!planet) return false;

      // Verifier qu'on a les vaisseaux
      for (const [type, count] of Object.entries(ships)) {
        const available = planet.ships[type as ShipType] || 0;
        if (available < count!) return false;
      }

      // Calculer la distance et le temps de vol
      const origin = planet.coordinates;
      let distance: number;
      if (origin.galaxy !== destination.galaxy) {
        distance = 20000 * Math.abs(origin.galaxy - destination.galaxy);
      } else if (origin.system !== destination.system) {
        distance = 2700 + 95 * Math.abs(origin.system - destination.system);
      } else {
        distance = 1000 + 5 * Math.abs(origin.position - destination.position);
      }

      // Vitesse la plus lente de la flotte
      const slowest = Math.min(
        ...Object.keys(ships).map((type) => {
          const data = SHIPS_DATA[type as ShipType];
          return data?.speed || 1000;
        }),
      );

      // Temps en secondes (simplifie, rapide pour le jeu solo)
      const flightTime = Math.max(5, Math.floor((10 + (35000 / (speed / 100) * Math.sqrt(distance * 10 / slowest)))));

      // Consommation deuterium (simplifiee)
      const totalShips = Object.values(ships).reduce((a, b) => a + b!, 0);
      const fuelCost = Math.floor(distance * totalShips * 0.01);

      if (planet.resources.deuterium < fuelCost) return false;

      const now = Date.now();
      const fleetId = `fleet-${now}-${Math.random().toString(36).slice(2, 8)}`;

      // Retirer les vaisseaux et le deuterium de la planete
      const newShips = { ...planet.ships };
      for (const [type, count] of Object.entries(ships)) {
        newShips[type as ShipType] = (newShips[type as ShipType] || 0) - count!;
        if (newShips[type as ShipType]! <= 0) delete newShips[type as ShipType];
      }

      const movement: FleetMovement = {
        id: fleetId,
        ships,
        origin: planet.coordinates,
        destination,
        mission,
        cargo: { metal: 0, crystal: 0, deuterium: 0 },
        departureTime: now,
        arrivalTime: now + flightTime * 1000,
        returnTime: mission !== 'deploy' ? now + flightTime * 2000 : undefined,
        speed,
      };

      set((s) => ({
        planets: s.planets.map((p) =>
          p.id === originPlanetId
            ? {
                ...p,
                ships: newShips,
                resources: { ...p.resources, deuterium: p.resources.deuterium - fuelCost },
              }
            : p
        ),
        fleetMovements: [...s.fleetMovements, movement],
      }));

      return true;
    },

    // === MISSILES ===
    launchMissile: (originPlanetId, destination, count) => {
      const state = get();
      const planet = state.planets.find((p) => p.id === originPlanetId);
      if (!planet) return false;

      const available = planet.defenses.interplanetaryMissile || 0;
      if (available < count) return false;

      // Verifier portee : meme galaxie, systeme a portee du silo
      const siloLevel = planet.buildings.missileSilo;
      const range = siloLevel * 5; // portee en systemes
      if (destination.galaxy !== planet.coordinates.galaxy) return false;
      if (Math.abs(destination.system - planet.coordinates.system) > range) return false;

      // Simuler l'impact : chaque missile fait 12000 de degats aux defenses NPC
      // L'ABM ennemi intercepte 1 missile chacun (NPC a 0 ABM par defaut)
      const damagePerMissile = 12000 * (1 + 0.1 * (state.research.weaponsTech || 0));
      const totalDamage = damagePerMissile * count;

      // Retirer les missiles de la planete
      const newDefenses = { ...planet.defenses };
      newDefenses.interplanetaryMissile = available - count;
      if (newDefenses.interplanetaryMissile <= 0) delete newDefenses.interplanetaryMissile;

      const now = Date.now();

      set((s) => ({
        planets: s.planets.map((p) =>
          p.id === originPlanetId
            ? { ...p, defenses: newDefenses }
            : p
        ),
        messages: [...s.messages, {
          id: `msg-${now}-${Math.random().toString(36).slice(2, 8)}`,
          type: 'combat' as const,
          timestamp: now,
          title: `Missile IP [${destination.galaxy}:${destination.system}:${destination.position}]`,
          read: false,
          body: `${count} missile${count > 1 ? 's' : ''} interplanetaire${count > 1 ? 's' : ''} lance${count > 1 ? 's' : ''} pour ${formatNumber(totalDamage)} degats totaux sur les defenses ennemies.`,
        }],
      }));

      return true;
    },

    // === MESSAGES ===
    markMessageRead: (id) => {
      set((s) => ({
        messages: s.messages.map((m) => (m.id === id ? { ...m, read: true } : m)),
      }));
    },

    deleteMessage: (id) => {
      set((s) => ({
        messages: s.messages.filter((m) => m.id !== id),
      }));
    },

    // === TICK ===
    tickConstructions: () => {
      const state = get();

      // Tick construction batiments
      const newQueues = { ...state.buildingQueues };
      let planetsChanged = false;
      const updatedPlanets = [...state.planets];

      for (const [planetId, queue] of Object.entries(newQueues)) {
        if (!queue) continue;

        const newRemaining = queue.remainingTime - 1;
        if (newRemaining <= 0) {
          // Construction terminee !
          newQueues[planetId] = null;
          const pIdx = updatedPlanets.findIndex((p) => p.id === planetId);
          if (pIdx !== -1) {
            updatedPlanets[pIdx] = {
              ...updatedPlanets[pIdx],
              buildings: {
                ...updatedPlanets[pIdx].buildings,
                [queue.building]: queue.targetLevel,
              },
            };
            planetsChanged = true;
          }
        } else {
          newQueues[planetId] = { ...queue, remainingTime: newRemaining };
        }
      }

      // Tick recherche
      let newResearchQueue = state.researchQueue;
      let researchChanged: Partial<Record<ResearchType, number>> | null = null;

      if (newResearchQueue) {
        const newRemaining = newResearchQueue.remainingTime - 1;
        if (newRemaining <= 0) {
          researchChanged = { [newResearchQueue.research]: newResearchQueue.targetLevel };
          newResearchQueue = null;
        } else {
          newResearchQueue = { ...newResearchQueue, remainingTime: newRemaining };
        }
      }

      // Tick fleet movements
      const now = Date.now();
      const newMessages: GameMessage[] = [];
      const resolvedFleetIds: string[] = [];

      for (const fleet of state.fleetMovements) {
        // Flotte arrivee a destination (phase aller)
        if (now >= fleet.arrivalTime && !(fleet as FleetMovement & { resolved?: boolean }).resolved) {
          if (fleet.mission === 'attack') {
            // Simuler le combat contre un NPC
            const targetSystem = getSystem(fleet.destination.galaxy, fleet.destination.system);
            const targetSlot = targetSystem?.slots.find((s: { position: number }) => s.position === fleet.destination.position);
            const defenderShips: Partial<Record<ShipType, number>> = {};
            const defenderDefenses: Partial<Record<DefenseType, number>> = {};
            const defenderResources = { metal: 50000, crystal: 25000, deuterium: 10000 };

            // NPC avec quelques unites aleatoires
            if (targetSlot?.planet?.playerId && targetSlot.planet.playerId !== 'player') {
              defenderShips.lightFighter = Math.floor(Math.random() * 10) + 2;
              defenderShips.heavyFighter = Math.floor(Math.random() * 5);
              defenderDefenses.rocketLauncher = Math.floor(Math.random() * 15) + 5;
              defenderDefenses.lightLaser = Math.floor(Math.random() * 8);
            }

            const combatInput: CombatInput = {
              attacker: {
                ships: fleet.ships,
                weaponTech: state.research.weaponsTech || 0,
                shieldTech: state.research.shieldingTech || 0,
                armourTech: state.research.armourTech || 0,
              },
              defender: {
                ships: defenderShips,
                defenses: defenderDefenses,
                weaponTech: 0,
                shieldTech: 0,
                armourTech: 0,
                resources: defenderResources,
              },
            };

            const result = simulateCombat(combatInput);

            // Ajouter le butin aux vaisseaux survivants (sera credite au retour)
            fleet.cargo = result.loot;

            // Mettre a jour les vaisseaux survivants pour le retour
            fleet.ships = result.attackerSurvivors as Partial<Record<ShipType, number>>;

            // Generation de lune (si chance > 0 et pas deja de lune sur la planete d'origine)
            let moonCreated = false;
            if (result.moonChance > 0) {
              const roll = Math.random() * 100;
              if (roll < result.moonChance) {
                // Creer une lune sur la planete d'origine de l'attaquant
                const originIdx = updatedPlanets.findIndex(
                  (p) => p.coordinates.galaxy === fleet.origin.galaxy
                    && p.coordinates.system === fleet.origin.system
                    && p.coordinates.position === fleet.origin.position,
                );
                if (originIdx !== -1 && !updatedPlanets[originIdx].moon) {
                  const moonSize = Math.min(8, Math.max(1, Math.floor(result.moonChance / 3) + 1));
                  updatedPlanets[originIdx] = {
                    ...updatedPlanets[originIdx],
                    moon: {
                      id: `moon-${updatedPlanets[originIdx].id}`,
                      name: `Lune de ${updatedPlanets[originIdx].name}`,
                      size: moonSize,
                      buildings: {},
                      ships: {},
                      defenses: {},
                    },
                  };
                  planetsChanged = true;
                  moonCreated = true;
                }
              }
            }

            newMessages.push({
              id: `msg-${now}-${Math.random().toString(36).slice(2, 8)}`,
              type: 'combat',
              timestamp: now,
              title: `Combat [${fleet.destination.galaxy}:${fleet.destination.system}:${fleet.destination.position}]`,
              read: false,
              combatResult: result,
              body: moonCreated ? 'Une lune a ete creee a partir des debris de la bataille !' : undefined,
            });
          } else if (fleet.mission === 'espionage') {
            // Rapport d'espionnage
            const targetSystem = getSystem(fleet.destination.galaxy, fleet.destination.system);
            const targetSlot = targetSystem?.slots.find((s: { position: number }) => s.position === fleet.destination.position);

            const spyLevel = state.research.espionageTech || 0;
            const probeCount = fleet.ships.espionageProbe || 1;
            // Contre-espionnage : defenseur NPC a un niveau d'espionnage aleatoire 0-3
            const defenderSpyLevel = Math.floor(Math.random() * 4);
            // Chance de perte des sondes : base 2% * (defenderSpyLevel - spyLevel + probes)
            const lossChance = Math.max(0, 0.02 * (defenderSpyLevel - spyLevel + probeCount));
            const probesLost = Math.random() < lossChance;

            // Niveau d'info : chaque sonde et chaque niveau de tech augmente la visibilite
            const infoLevel = spyLevel + Math.floor(Math.sqrt(probeCount));

            const report: GameMessage['espionageReport'] = {
              planetName: targetSlot?.planet?.name || 'Planete inconnue',
              coordinates: fleet.destination,
              resources: {
                metal: Math.floor(Math.random() * 100000) + 10000,
                crystal: Math.floor(Math.random() * 50000) + 5000,
                deuterium: Math.floor(Math.random() * 20000) + 2000,
              },
            };

            // Info progressive : flotte a partir de niveau 2, defenses a 4, recherches a 6
            if (infoLevel >= 2) {
              report.ships = {};
              if (targetSlot?.planet?.playerId && targetSlot.planet.playerId !== 'player') {
                report.ships.lightFighter = Math.floor(Math.random() * 10) + 2;
                if (infoLevel >= 3) report.ships.heavyFighter = Math.floor(Math.random() * 5);
                if (infoLevel >= 5) report.ships.cruiser = Math.floor(Math.random() * 3);
              }
            }
            if (infoLevel >= 4) {
              report.defenses = {};
              if (targetSlot?.planet?.playerId && targetSlot.planet.playerId !== 'player') {
                report.defenses.rocketLauncher = Math.floor(Math.random() * 15) + 5;
                if (infoLevel >= 5) report.defenses.lightLaser = Math.floor(Math.random() * 8);
                if (infoLevel >= 6) report.defenses.heavyLaser = Math.floor(Math.random() * 4);
              }
            }
            if (infoLevel >= 6) {
              report.research = {
                weaponsTech: Math.floor(Math.random() * 5),
                shieldingTech: Math.floor(Math.random() * 4),
                armourTech: Math.floor(Math.random() * 4),
              };
            }

            // Si sondes perdues, elles ne reviennent pas
            if (probesLost) {
              fleet.ships = {};
            }

            const lossNote = probesLost
              ? '\nVos sondes ont ete detectees et detruites par le defenseur !'
              : '';

            newMessages.push({
              id: `msg-${now}-${Math.random().toString(36).slice(2, 8)}`,
              type: 'espionage',
              timestamp: now,
              title: `Espionnage [${fleet.destination.galaxy}:${fleet.destination.system}:${fleet.destination.position}]`,
              read: false,
              espionageReport: report,
              body: `Niveau d'info : ${infoLevel} (${probeCount} sonde${probeCount > 1 ? 's' : ''}, tech ${spyLevel})${lossNote}`,
            });
          }

          // Marquer comme resolu (aller)
          (fleet as FleetMovement & { resolved?: boolean }).resolved = true;
        }

        // Flotte de retour
        if (fleet.returnTime && now >= fleet.returnTime) {
          // Retourner les vaisseaux et le cargo a la planete d'origine
          const pIdx = updatedPlanets.findIndex(
            (p) => p.coordinates.galaxy === fleet.origin.galaxy
              && p.coordinates.system === fleet.origin.system
              && p.coordinates.position === fleet.origin.position,
          );
          if (pIdx !== -1) {
            const p = updatedPlanets[pIdx];
            const returnedShips = { ...p.ships };
            for (const [type, count] of Object.entries(fleet.ships)) {
              returnedShips[type as ShipType] = (returnedShips[type as ShipType] || 0) + count!;
            }
            updatedPlanets[pIdx] = {
              ...p,
              ships: returnedShips,
              resources: {
                metal: p.resources.metal + (fleet.cargo.metal || 0),
                crystal: p.resources.crystal + (fleet.cargo.crystal || 0),
                deuterium: p.resources.deuterium + (fleet.cargo.deuterium || 0),
              },
            };
            planetsChanged = true;
          }
          resolvedFleetIds.push(fleet.id);
        } else if (!fleet.returnTime && now >= fleet.arrivalTime) {
          // Deploy sans retour - terminee
          resolvedFleetIds.push(fleet.id);
        }
      }

      const newFleetMovements = resolvedFleetIds.length > 0
        ? state.fleetMovements.filter((f) => !resolvedFleetIds.includes(f.id))
        : state.fleetMovements;

      set({
        buildingQueues: newQueues,
        ...(planetsChanged ? { planets: updatedPlanets } : {}),
        researchQueue: newResearchQueue,
        ...(researchChanged
          ? { research: { ...state.research, ...researchChanged } }
          : {}),
        ...(resolvedFleetIds.length > 0 ? { fleetMovements: newFleetMovements } : {}),
        ...(newMessages.length > 0
          ? { messages: [...state.messages, ...newMessages] }
          : {}),
      });
    },
  };
    },
    {
      name: 'ogame2d-save',
      // Ne pas persister les fonctions ni les getters derives
      partialize: (state) => ({
        planets: state.planets,
        currentPlanetId: state.currentPlanetId,
        research: state.research,
        buildingQueues: state.buildingQueues,
        researchQueue: state.researchQueue,
        shipyardQueues: state.shipyardQueues,
        fleetMovements: state.fleetMovements,
        messages: state.messages,
      }),
    },
  ),
);
