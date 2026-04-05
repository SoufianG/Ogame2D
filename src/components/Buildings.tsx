import { useGameStore } from '../store/gameStore';
import {
  BUILDING_CATEGORIES,
  getBuildingsForCategory,
  getBuildingCost,
  getBuildingTime,
} from '../data/buildings';
import type { BuildingData } from '../data/buildings';
import { checkPrerequisites, canAfford } from '../utils/prerequisites';
import { formatNumber, formatTime } from '../utils/format';

function BuildingCard({ data }: { data: BuildingData }) {
  const planet = useGameStore((s) => s.currentPlanet)();
  const research = useGameStore((s) => s.research);
  const buildingQueue = useGameStore((s) =>
    s.currentPlanetId ? s.buildingQueues[s.currentPlanetId] : null
  );
  const startBuilding = useGameStore((s) => s.startBuilding);
  const cancelBuilding = useGameStore((s) => s.cancelBuilding);

  if (!planet) return null;

  const currentLevel = planet.buildings[data.id];
  const nextLevel = currentLevel + 1;
  const cost = getBuildingCost(data, nextLevel);
  const time = getBuildingTime(cost, planet.buildings.roboticsFactory);
  const missing = checkPrerequisites(data.prerequisites, planet, research);
  const affordable = canAfford(cost, planet.resources);
  const isBuilding = buildingQueue?.building === data.id;
  const queueBusy = buildingQueue !== null && buildingQueue !== undefined;

  // Verifier si c'est un nouveau batiment et s'il reste des cases
  const isNew = currentLevel === 0;
  const usedSlots = Object.values(planet.buildings).filter((l) => l > 0).length;
  const noSlots = isNew && usedSlots >= planet.size;

  const locked = missing.length > 0;
  const canBuild = !locked && affordable && !queueBusy && !noSlots;

  const handleClick = async () => {
    if (isBuilding) {
      await cancelBuilding(planet.id);
    } else if (canBuild) {
      await startBuilding(planet.id, data.id);
    }
  };

  return (
    <div className={`building-card ${locked ? 'locked' : ''} ${isBuilding ? 'building' : ''}`}>
      <div className="building-header">
        <div className="building-title">
          <h3>{data.name}</h3>
          <span className="building-level">Niv. {currentLevel}</span>
        </div>
      </div>

      <p className="building-desc">{data.description}</p>

      {/* Cout */}
      <div className="building-cost">
        <span className={planet.resources.metal >= cost.metal ? '' : 'insufficient'}>
          Fe {formatNumber(cost.metal)}
        </span>
        <span className={planet.resources.crystal >= cost.crystal ? '' : 'insufficient'}>
          Cr {formatNumber(cost.crystal)}
        </span>
        {cost.deuterium > 0 && (
          <span className={planet.resources.deuterium >= cost.deuterium ? '' : 'insufficient'}>
            De {formatNumber(cost.deuterium)}
          </span>
        )}
        <span className="build-time">{formatTime(time)}</span>
      </div>

      {/* Prerequis manquants */}
      {locked && (
        <div className="building-prereqs">
          {missing.map((m) => (
            <span key={m.id} className="prereq-missing">
              {m.id} niv. {m.required} (actuel: {m.current})
            </span>
          ))}
        </div>
      )}

      {noSlots && !locked && (
        <div className="building-prereqs">
          <span className="prereq-missing">Plus de cases disponibles</span>
        </div>
      )}

      {/* Timer en cours */}
      {isBuilding && buildingQueue && (
        <div className="building-timer">
          <div className="timer-bar">
            <div
              className="timer-fill"
              style={{
                width: `${((buildingQueue.totalTime - buildingQueue.remainingTime) / buildingQueue.totalTime) * 100}%`,
              }}
            />
          </div>
          <span className="timer-text">
            Niv. {buildingQueue.targetLevel} — {formatTime(buildingQueue.remainingTime)}
          </span>
        </div>
      )}

      {/* Bouton */}
      <button
        className={`build-btn ${isBuilding ? 'cancel' : canBuild ? 'ready' : 'disabled'}`}
        onClick={handleClick}
        disabled={!canBuild && !isBuilding}
      >
        {isBuilding ? 'Annuler' : locked ? 'Verrouille' : canBuild ? `Construire niv. ${nextLevel}` : 'Ressources insuffisantes'}
      </button>
    </div>
  );
}

export function Buildings() {
  const planet = useGameStore((s) => s.currentPlanet)();

  if (!planet) return <div>Aucune planete selectionnee</div>;

  const usedSlots = Object.values(planet.buildings).filter((l) => l > 0).length;

  return (
    <div className="buildings-page">
      <div className="page-header">
        <h2>Batiments</h2>
        <span className="slots-info">Cases : {usedSlots} / {planet.size}</span>
      </div>

      {BUILDING_CATEGORIES.map(({ key, label }) => {
        const buildings = getBuildingsForCategory(key);
        return (
          <div key={key} className="building-category">
            <h3 className="category-title">{label}</h3>
            <div className="building-grid">
              {buildings.map((b) => (
                <BuildingCard key={b.id} data={b} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
