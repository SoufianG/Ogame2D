import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { PlanetRenderer } from './PlanetRenderer';
import { SHIPS_DATA, DEFENSES_DATA } from '../data/ships';
import { computeProduction } from '../utils/production';
import { formatNumber, formatTime } from '../utils/format';
import { apiPut } from '../api/client';
import { refreshGameState } from '../api/sync';
import type { ShipType, DefenseType } from '../types/fleet';
import type { Planet } from '../types';

const BIOME_LABELS: Record<string, string> = {
  glacial: 'Glaciaire',
  tundra: 'Toundra',
  temperate: 'Temperee',
  arid: 'Aride',
  volcanic: 'Volcanique',
};

const MISSION_LABELS: Record<string, string> = {
  attack: 'Attaque',
  transport: 'Transport',
  deploy: 'Stationner',
  espionage: 'Espionnage',
  colonize: 'Colonisation',
  recycle: 'Recyclage',
};

function PlanetName({ planet }: { planet: Planet }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(planet.name);

  const save = async () => {
    if (name.trim() && name.trim() !== planet.name) {
      await apiPut(`/planets/${planet.id}/rename`, { name: name.trim() });
      await refreshGameState();
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="planet-name-edit">
        <input
          className="planet-name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
          maxLength={24}
          autoFocus
        />
        <button className="build-btn ready" onClick={save}>OK</button>
        <button className="build-btn" onClick={() => setEditing(false)}>X</button>
      </div>
    );
  }

  return (
    <h2 className="planet-name" onClick={() => { setName(planet.name); setEditing(true); }} title="Cliquer pour renommer">
      {planet.name} <span className="rename-hint">&#9998;</span>
    </h2>
  );
}

function CollapsibleSection({ title, defaultOpen = false, count, children }: {
  title: string;
  defaultOpen?: boolean;
  count?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overview-section">
      <div className="section-header" onClick={() => setOpen(!open)}>
        <h3 className="section-title">
          {open ? '\u25BC' : '\u25B6'} {title}
          {count !== undefined && count > 0 && <span className="section-count">{count}</span>}
        </h3>
      </div>
      {open && <div className="section-content">{children}</div>}
    </div>
  );
}

function MiniPlanetCard({ planet, isCurrent, onClick }: {
  planet: Planet;
  isCurrent: boolean;
  onClick: () => void;
}) {
  const coords = `[${planet.coordinates.galaxy}:${planet.coordinates.system}:${planet.coordinates.position}]`;
  return (
    <div className={`mini-planet-card ${isCurrent ? 'active' : ''}`} onClick={onClick}>
      <PlanetRenderer planet={planet} size={48} />
      <div className="mini-planet-info">
        <span className="mini-planet-name">{planet.name}</span>
        <span className="mini-planet-coords">{coords}</span>
      </div>
    </div>
  );
}

export function Overview() {
  const planets = useGameStore((s) => s.planets);
  const currentPlanet = useGameStore((s) => s.currentPlanet)();
  const setCurrentPlanet = useGameStore((s) => s.setCurrentPlanet);
  const buildingQueues = useGameStore((s) => s.buildingQueues);
  const researchQueue = useGameStore((s) => s.researchQueue);
  const fleetMovements = useGameStore((s) => s.fleetMovements);

  if (!currentPlanet) return <div>Aucune planete selectionnee</div>;

  const { coordinates, temperature, biome, resources } = currentPlanet;
  const coords = `[${coordinates.galaxy}:${coordinates.system}:${coordinates.position}]`;
  const production = computeProduction(currentPlanet);

  const buildingQueue = buildingQueues[currentPlanet.id];
  const shipCount = Object.values(currentPlanet.ships || {}).reduce((a, b) => a + (b || 0), 0);
  const defenseCount = Object.values(currentPlanet.defenses || {}).reduce((a, b) => a + (b || 0), 0);

  return (
    <div className="overview">
      {/* Barre de ressources */}
      <div className="resources-bar">
        <div className="resource-item">
          <img src="/assets/fer.png" alt="Metal" className="resource-img" />
          <div className="resource-data">
            <span className="resource-label">Metal</span>
            <span className="resource-value">{formatNumber(resources.metal)}</span>
            <span className="resource-sub">+{formatNumber(production.metalPerHour)}/h</span>
          </div>
        </div>
        <div className="resource-item">
          <img src="/assets/cristal.png" alt="Cristal" className="resource-img" />
          <div className="resource-data">
            <span className="resource-label">Cristal</span>
            <span className="resource-value">{formatNumber(resources.crystal)}</span>
            <span className="resource-sub">+{formatNumber(production.crystalPerHour)}/h</span>
          </div>
        </div>
        <div className="resource-item">
          <img src="/assets/deuterium.png" alt="Deuterium" className="resource-img" />
          <div className="resource-data">
            <span className="resource-label">Deuterium</span>
            <span className="resource-value">{formatNumber(resources.deuterium)}</span>
            <span className="resource-sub">+{formatNumber(production.deuteriumPerHour)}/h</span>
          </div>
        </div>
        <div className="resource-item">
          <div className="resource-icon energy">En</div>
          <div className="resource-data">
            <span className="resource-label">Energie</span>
            <span className={`resource-value ${production.energyBalance >= 0 ? 'positive' : 'negative'}`}>
              {production.energyBalance >= 0 ? '+' : ''}{formatNumber(production.energyBalance)}
            </span>
            <span className="resource-sub">
              {formatNumber(production.energyProduction)} / {formatNumber(production.energyConsumption)}
            </span>
          </div>
        </div>
      </div>

      {/* Planete courante en grand */}
      <div className="planet-section">
        <div className="planet-view">
          <PlanetRenderer planet={currentPlanet} size={200} />
        </div>
        <div className="planet-details">
          <PlanetName planet={currentPlanet} />
          <div className="planet-stats">
            <div className="stat-row">
              <span className="stat-label">Coordonnees</span>
              <span className="stat-value">{coords}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Temperature</span>
              <span className="stat-value">{temperature}°C</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Type</span>
              <span className="stat-value">{BIOME_LABELS[biome] ?? biome}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Autres planetes en petit */}
      {planets.length > 1 && (
        <div className="other-planets">
          {planets.filter((p) => p.id !== currentPlanet.id).map((p) => (
            <MiniPlanetCard
              key={p.id}
              planet={p}
              isCurrent={false}
              onClick={() => setCurrentPlanet(p.id)}
            />
          ))}
        </div>
      )}

      {/* Construction en cours */}
      {buildingQueue && (
        <div className="overview-activity">
          <div className="activity-item building">
            <img src="/assets/placeholder.png" alt="" className="activity-icon" />
            <div className="activity-info">
              <span className="activity-label">Construction</span>
              <span className="activity-detail">{buildingQueue.building} niv. {buildingQueue.targetLevel}</span>
            </div>
            <div className="activity-timer">
              <div className="timer-bar">
                <div className="timer-fill" style={{
                  width: `${((buildingQueue.totalTime - buildingQueue.remainingTime) / buildingQueue.totalTime) * 100}%`,
                }} />
              </div>
              <span className="timer-text">{formatTime(buildingQueue.remainingTime)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Recherche en cours */}
      {researchQueue && (
        <div className="overview-activity">
          <div className="activity-item research">
            <img src="/assets/placeholder.png" alt="" className="activity-icon" />
            <div className="activity-info">
              <span className="activity-label">Recherche</span>
              <span className="activity-detail">{researchQueue.research} niv. {researchQueue.targetLevel}</span>
            </div>
            <div className="activity-timer">
              <div className="timer-bar">
                <div className="timer-fill" style={{
                  width: `${((researchQueue.totalTime - researchQueue.remainingTime) / researchQueue.totalTime) * 100}%`,
                }} />
              </div>
              <span className="timer-text">{formatTime(researchQueue.remainingTime)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Mouvements de flottes */}
      {fleetMovements.length > 0 && (
        <CollapsibleSection title="Mouvements de flottes" defaultOpen count={fleetMovements.length}>
          <div className="fleet-movements-list">
            {fleetMovements.map((fm) => {
              const now = Date.now();
              const totalTime = fm.arrivalTime - fm.departureTime;
              const elapsed = now - fm.departureTime;
              const progress = Math.min(100, (elapsed / totalTime) * 100);
              const remaining = Math.max(0, Math.floor((fm.arrivalTime - now) / 1000));
              const totalShips = Object.values(fm.ships).reduce((a, b) => a + b!, 0);
              const isReturning = fm.returnTime && now >= fm.arrivalTime;

              return (
                <div key={fm.id} className="activity-item fleet">
                  <div className="activity-info">
                    <span className="activity-label">{MISSION_LABELS[fm.mission] || fm.mission}</span>
                    <span className="activity-detail">
                      {totalShips} vaisseau{totalShips > 1 ? 'x' : ''}
                      {' '}{isReturning ? '\u2190' : '\u2192'}{' '}
                      [{fm.destination.galaxy}:{fm.destination.system}:{fm.destination.position}]
                    </span>
                  </div>
                  <div className="activity-timer">
                    <div className="timer-bar">
                      <div className="timer-fill" style={{
                        width: `${isReturning
                          ? Math.min(100, ((now - fm.arrivalTime) / (fm.returnTime! - fm.arrivalTime)) * 100)
                          : progress}%`,
                      }} />
                    </div>
                    <span className="timer-text">
                      {formatTime(isReturning
                        ? Math.max(0, Math.floor((fm.returnTime! - now) / 1000))
                        : remaining)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Flotte a quai */}
      <CollapsibleSection title="Flotte a quai" count={shipCount}>
        {shipCount > 0 ? (
          <div className="unit-list">
            {Object.entries(currentPlanet.ships).filter(([, c]) => c! > 0).map(([type, count]) => (
              <div key={type} className="unit-row">
                <img src="/assets/placeholder.png" alt="" className="unit-icon" />
                <span className="unit-name">{SHIPS_DATA[type as ShipType]?.name || type}</span>
                <span className="unit-qty">x{count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-text">Aucun vaisseau stationne</p>
        )}
      </CollapsibleSection>

      {/* Defenses */}
      <CollapsibleSection title="Defenses" count={defenseCount}>
        {defenseCount > 0 ? (
          <div className="unit-list">
            {Object.entries(currentPlanet.defenses).filter(([, c]) => c! > 0).map(([type, count]) => (
              <div key={type} className="unit-row">
                <img src="/assets/placeholder.png" alt="" className="unit-icon" />
                <span className="unit-name">{DEFENSES_DATA[type as DefenseType]?.name || type}</span>
                <span className="unit-qty">x{count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-text">Aucune defense</p>
        )}
      </CollapsibleSection>

      {/* Lune */}
      {currentPlanet.moon && (
        <div className="overview-section moon-section">
          <h3 className="section-title">Lune — {currentPlanet.moon.name}</h3>
          <div className="planet-stats">
            <div className="stat-row">
              <span className="stat-label">Taille</span>
              <span className="stat-value">{currentPlanet.moon.size}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
