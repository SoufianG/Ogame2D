import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { SolarSystemView } from './SolarSystemView';
import { getSystem, placePlayerPlanet, SYSTEM_COUNT } from '../data/universe';
import type { SolarSystem } from '../data/universe';

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

  // Charger le systeme et injecter la planete du joueur si necessaire
  useEffect(() => {
    const sys = getSystem(1, currentSystem);

    // Injecter les planetes du joueur dans le systeme
    const { planets } = useGameStore.getState();
    for (const p of planets) {
      if (p.coordinates.galaxy === 1 && p.coordinates.system === currentSystem) {
        placePlayerPlanet(
          p.coordinates,
          p.name,
          p.size,
          p.temperature,
          p.biome,
          p.aquaticity,
          !!p.moon,
        );
      }
    }

    setSystem(sys);
  }, [currentSystem]);

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
          <span className="legend-dot npc" /> Occupe
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
