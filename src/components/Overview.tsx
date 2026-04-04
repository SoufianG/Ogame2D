import { useGameStore } from '../store/gameStore';
import { PlanetRenderer } from './PlanetRenderer';
import { SHIPS_DATA, DEFENSES_DATA } from '../data/ships';
import { computeProduction } from '../utils/production';
import { formatNumber } from '../utils/format';
import type { ShipType, DefenseType } from '../types/fleet';

const BIOME_LABELS: Record<string, string> = {
  glacial: 'Glaciaire',
  tundra: 'Toundra',
  temperate: 'Temperee',
  arid: 'Aride',
  volcanic: 'Volcanique',
};

export function Overview() {
  const currentPlanet = useGameStore((s) => s.currentPlanet)();

  if (!currentPlanet) return <div>Aucune planete selectionnee</div>;

  const { name, coordinates, temperature, biome, size, resources } = currentPlanet;
  const coords = `[${coordinates.galaxy}:${coordinates.system}:${coordinates.position}]`;
  const production = computeProduction(currentPlanet);

  return (
    <div className="overview">
      {/* Barre de ressources */}
      <div className="resources-bar">
        <div className="resource-item">
          <div className="resource-icon metal">Fe</div>
          <div className="resource-data">
            <span className="resource-label">Metal</span>
            <span className="resource-value">{formatNumber(resources.metal)}</span>
            <span className="resource-sub">+{formatNumber(production.metalPerHour)}/h</span>
          </div>
        </div>
        <div className="resource-item">
          <div className="resource-icon crystal">Cr</div>
          <div className="resource-data">
            <span className="resource-label">Cristal</span>
            <span className="resource-value">{formatNumber(resources.crystal)}</span>
            <span className="resource-sub">+{formatNumber(production.crystalPerHour)}/h</span>
          </div>
        </div>
        <div className="resource-item">
          <div className="resource-icon deuterium">De</div>
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

      {/* Vue planete + infos */}
      <div className="planet-section">
        <div className="planet-view">
          <PlanetRenderer planet={currentPlanet} size={200} />
        </div>
        <div className="planet-details">
          <h2 className="planet-name">{name}</h2>
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
            <div className="stat-row">
              <span className="stat-label">Taille</span>
              <span className="stat-value">{size} cases</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Cases utilisees</span>
              <span className="stat-value">
                {Object.values(currentPlanet.buildings).reduce((a, b) => a + (b > 0 ? 1 : 0), 0)} / {size}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Flotte stationnee */}
      {Object.keys(currentPlanet.ships || {}).length > 0 && (
        <div className="overview-section">
          <h3 className="section-title">Flotte stationnee</h3>
          <div className="unit-stats">
            {Object.entries(currentPlanet.ships).map(([type, count]) => (
              <span key={type}>
                {SHIPS_DATA[type as ShipType]?.name || type}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Defenses */}
      {Object.keys(currentPlanet.defenses || {}).length > 0 && (
        <div className="overview-section">
          <h3 className="section-title">Defenses</h3>
          <div className="unit-stats">
            {Object.entries(currentPlanet.defenses).map(([type, count]) => (
              <span key={type}>
                {DEFENSES_DATA[type as DefenseType]?.name || type}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Lune */}
      {currentPlanet.moon && (
        <div className="overview-section moon-section">
          <h3 className="section-title">Lune</h3>
          <div className="planet-stats">
            <div className="stat-row">
              <span className="stat-label">Nom</span>
              <span className="stat-value">{currentPlanet.moon.name}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Taille</span>
              <span className="stat-value">{currentPlanet.moon.size} cases</span>
            </div>
            {Object.entries(currentPlanet.moon.buildings).length > 0 && (
              <div className="stat-row">
                <span className="stat-label">Batiments</span>
                <span className="stat-value">
                  {Object.entries(currentPlanet.moon.buildings)
                    .filter(([, lvl]) => lvl! > 0)
                    .map(([b, lvl]) => `${b} niv.${lvl}`)
                    .join(', ') || 'Aucun'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
