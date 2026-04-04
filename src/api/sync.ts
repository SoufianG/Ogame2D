import { apiGet, apiPost, apiPut } from './client';
import { useGameStore } from '../store/gameStore';
import type { Planet } from '../types';
import type { ResearchType } from '../types/research';
import { getBiome } from '../types/planet';

interface ApiPlanet {
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
}

function apiPlanetToLocal(p: ApiPlanet): Planet {
  return {
    id: p.id,
    name: p.name,
    coordinates: { galaxy: p.galaxy, system: p.system, position: p.position },
    size: p.size,
    temperature: p.temperature,
    biome: getBiome(p.temperature),
    aquaticity: p.aquaticity,
    resources: { metal: p.metal, crystal: p.crystal, deuterium: p.deuterium },
    storage: { metal: 10000, crystal: 10000, deuterium: 10000 },
    buildings: p.buildings as Planet['buildings'],
    ships: p.ships,
    defenses: p.defenses,
    moon: undefined,
  };
}

// Charger l'etat complet depuis le backend
export async function loadGameState(): Promise<boolean> {
  try {
    const [planets, research] = await Promise.all([
      apiGet<ApiPlanet[]>('/planets'),
      apiGet<Record<string, number>>('/game/research'),
    ]);

    const store = useGameStore.getState();

    if (planets.length === 0) {
      // Premiere connexion : creer la planete de depart
      const newPlanet = await apiPost<ApiPlanet>('/planets', {});
      useGameStore.setState({
        planets: [apiPlanetToLocal(newPlanet)],
        currentPlanetId: newPlanet.id,
        research: { ...store.research, ...research } as Record<ResearchType, number>,
      });
    } else {
      useGameStore.setState({
        planets: planets.map(apiPlanetToLocal),
        currentPlanetId: planets[0].id,
        research: { ...store.research, ...research } as Record<ResearchType, number>,
      });
    }

    return true;
  } catch (err) {
    console.error('Failed to load game state:', err);
    return false;
  }
}

// Sauvegarder l'etat d'une planete vers le backend
export async function savePlanetState(planet: Planet): Promise<void> {
  try {
    await apiPut(`/planets/${planet.id}`, {
      metal: planet.resources.metal,
      crystal: planet.resources.crystal,
      deuterium: planet.resources.deuterium,
      buildings: planet.buildings,
      ships: planet.ships,
      defenses: planet.defenses,
    });
  } catch (err) {
    console.error('Failed to save planet:', err);
  }
}

// Sauvegarder les recherches
export async function saveResearch(): Promise<void> {
  try {
    const research = useGameStore.getState().research;
    await apiPut('/game/research', research);
  } catch (err) {
    console.error('Failed to save research:', err);
  }
}

// Sauvegarder tout l'etat periodiquement
export async function saveAll(): Promise<void> {
  const { planets } = useGameStore.getState();
  await Promise.all([
    ...planets.map(savePlanetState),
    saveResearch(),
  ]);
}
