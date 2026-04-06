import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { SolarSystemView } from './SolarSystemView';
import { generateSystem, SYSTEM_COUNT } from '../data/universe';
import type { SolarSystem } from '../data/universe';
import { apiGet } from '../api/client';
import { getBiome } from '../types/planet';

interface ServerGalaxyPlanet {
  position: number;
  name: string;
  size: number;
  temperature: number;
  biome: string;
  player_name: string;
  user_id: string;
  has_moon: number | null;
  status: string; // 'active' | 'inactive' | 'vacation'
}

export function Galaxy() {
  const planet = useGameStore((s) => s.currentPlanet)();
  const [currentSystem, setCurrentSystem] = useState(1);
  const [system, setSystem] = useState<SolarSystem | null>(null);

  // Initialiser sur le systeme du joueur
  useEffect(() => {
    if (planet) {
      setCurrentSystem(planet.coordinates.system);
    }
  }, [planet?.coordinates.system]);

  const loadSystem = useCallback(async (galaxy: number, sys: number) => {
    // Generer le systeme de base (visuels, etoile, slots vides)
    const baseSystem = generateSystem(galaxy, sys);

    // Charger les planetes reelles depuis le serveur
    try {
      const serverPlanets = await apiGet<ServerGalaxyPlanet[]>(`/game/galaxy/${galaxy}/${sys}`);

      // Injecter les vrais joueurs par-dessus la generation
      for (const sp of serverPlanets) {
        const slot = baseSystem.slots.find((s) => s.position === sp.position);
        if (slot) {
          const currentUserId = useGameStore.getState().planets[0]?.id ?
            undefined : undefined;

          // Determiner si c'est le joueur courant
          const myPlanets = useGameStore.getState().planets;
          const isMe = myPlanets.some(
            (p) => p.coordinates.galaxy === galaxy
              && p.coordinates.system === sys
              && p.coordinates.position === sp.position
          );

          slot.planet = {
            name: sp.name,
            size: sp.size,
            temperature: sp.temperature,
            biome: getBiome(sp.temperature),
            aquaticity: 0.3,
            playerId: isMe ? 'player' : sp.user_id,
            playerName: isMe ? 'Vous' : sp.player_name,
          };
          slot.moon = !!sp.has_moon;
        }
      }
    } catch {
      // Fallback : injecter seulement les planetes du joueur local
      const { planets } = useGameStore.getState();
      for (const p of planets) {
        if (p.coordinates.galaxy === galaxy && p.coordinates.system === sys) {
          const slot = baseSystem.slots.find((s) => s.position === p.coordinates.position);
          if (slot) {
            slot.planet = {
              name: p.name,
              size: p.size,
              temperature: p.temperature,
              biome: p.biome,
              aquaticity: p.aquaticity,
              playerId: 'player',
              playerName: 'Vous',
            };
            slot.moon = !!p.moon;
          }
        }
      }
    }

    setSystem(baseSystem);
  }, []);

  useEffect(() => {
    loadSystem(1, currentSystem);
  }, [currentSystem, loadSystem]);

  const goToSystem = (delta: number) => {
    setCurrentSystem((s) => {
      const next = s + delta;
      if (next < 1) return SYSTEM_COUNT;
      if (next > SYSTEM_COUNT) return 1;
      return next;
    });
  };

  return (
    <div className="galaxy-page">
      {/* Navigation systeme */}
      <div className="system-nav">
        <button className="system-nav-btn" onClick={() => goToSystem(-1)}>
          &larr;
        </button>
        <div className="system-nav-info">
          <span className="system-label">Systeme</span>
          <div className="system-selector">
            <input
              type="number"
              min={1}
              max={SYSTEM_COUNT}
              value={currentSystem}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                if (v >= 1 && v <= SYSTEM_COUNT) setCurrentSystem(v);
              }}
            />
            <span className="system-total">/ {SYSTEM_COUNT}</span>
          </div>
        </div>
        <button className="system-nav-btn" onClick={() => goToSystem(1)}>
          &rarr;
        </button>
        {planet && planet.coordinates.system !== currentSystem && (
          <button
            className="system-home-btn"
            onClick={() => setCurrentSystem(planet.coordinates.system)}
          >
            Mon systeme
          </button>
        )}
      </div>

      {/* Vue systeme solaire */}
      {system && (
        <SolarSystemView system={system} />
      )}

      {/* Legende */}
      <div className="system-legend">
        <span className="legend-item">
          <span className="legend-dot player" /> Vous
        </span>
        <span className="legend-item">
          <span className="legend-dot npc" /> Joueur
        </span>
        <span className="legend-item">
          <span className="legend-dot free" /> Libre
        </span>
        <span className="legend-item">
          <span className="legend-dot moon" /> Lune
        </span>
        <span className="legend-item">
          <span className="legend-dot debris" /> Debris
        </span>
      </div>
    </div>
  );
}
