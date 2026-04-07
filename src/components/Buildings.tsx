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
import { computeNextLevelPreview, isProducerBuilding } from '../utils/production';

function BuildingCard({ data }: { data: BuildingData }) {
  const planet = useGameStore((s) => s.currentPlanet)();
  const research = useGameStore((s) => s.research);
  const buildingQueue = useGameStore((s) =>
    s.currentPlanetId ? s.buildingQueues[s.currentPlanetId] : null
  );
  const startBuilding = useGameStore((s) => s.startBuilding);
  const cancelBuilding = useGameStore((s) => s.cancelBuilding);
  const setProductionFactor = useGameStore((s) => s.setProductionFactor);

  if (!planet) return null;

  const isProducer = isProducerBuilding(data.id);
  const factor = (planet.productionFactors?.[data.id] ?? 1);
  const preview = planet.buildings[data.id] >= 0 ? computeNextLevelPreview(planet, data.id) : null;

  const currentLevel = planet.buildings[data.id];
  const nextLevel = currentLevel + 1;
  const cost = getBuildingCost(data, nextLevel);
  const time = getBuildingTime(cost, planet.buildings.roboticsFactory);
  const missing = checkPrerequisites(data.prerequisites, planet, research);
  const affordable = canAfford(cost, planet.resources);
  const isBuilding = buildingQueue?.building === data.id;
  const queueBusy = buildingQueue !== null && buildingQueue !== undefined;

  const locked = missing.length > 0;
  const canBuild = !locked && affordable && !queueBusy;

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
        <img src="/assets/placeholder.png" alt="" className="card-icon" />
        <div className="building-title">
          <h3>{data.name}</h3>
          <span className="building-level">Niv. {currentLevel}</span>
        </div>
      </div>

      <p className="building-desc">{data.description}</p>

      {/* Cout */}
      <div className="building-cost">
        <span className={planet.resources.metal >= cost.metal ? '' : 'insufficient'}>
          <img src="/assets/fer.png" alt="" className="cost-icon" /> {formatNumber(cost.metal)}
        </span>
        <span className={planet.resources.crystal >= cost.crystal ? '' : 'insufficient'}>
          <img src="/assets/cristal.png" alt="" className="cost-icon" /> {formatNumber(cost.crystal)}
        </span>
        {cost.deuterium > 0 && (
          <span className={planet.resources.deuterium >= cost.deuterium ? '' : 'insufficient'}>
            <img src="/assets/deuterium.png" alt="" className="cost-icon" /> {formatNumber(cost.deuterium)}
          </span>
        )}
        <span className="build-time">{formatTime(time)}</span>
      </div>

      {/* Apercu prochain niveau (energie + production pour producteurs) */}
      {preview && (preview.deltaEnergyProduction !== 0 || preview.deltaEnergyConsumption !== 0 || preview.deltaMetal !== 0 || preview.deltaCrystal !== 0 || preview.deltaDeuterium !== 0) && (
        <div className="building-preview">
          <span className="preview-label">Niv. {nextLevel} :</span>
          {preview.deltaMetal !== 0 && (
            <span className="preview-delta">
              <img src="/assets/fer.png" alt="" className="cost-icon" /> {preview.deltaMetal > 0 ? '+' : ''}{formatNumber(preview.deltaMetal)}/h
            </span>
          )}
          {preview.deltaCrystal !== 0 && (
            <span className="preview-delta">
              <img src="/assets/cristal.png" alt="" className="cost-icon" /> {preview.deltaCrystal > 0 ? '+' : ''}{formatNumber(preview.deltaCrystal)}/h
            </span>
          )}
          {preview.deltaDeuterium !== 0 && (
            <span className="preview-delta">
              <img src="/assets/deuterium.png" alt="" className="cost-icon" /> {preview.deltaDeuterium > 0 ? '+' : ''}{formatNumber(preview.deltaDeuterium)}/h
            </span>
          )}
          {preview.deltaEnergyBalance !== 0 && (
            <span className={`preview-delta ${preview.deltaEnergyBalance < 0 ? 'negative' : 'positive'}`}>
              ⚡ {preview.deltaEnergyBalance > 0 ? '+' : ''}{formatNumber(preview.deltaEnergyBalance)}
            </span>
          )}
        </div>
      )}

      {/* Slider production 0-100% pour les producteurs */}
      {isProducer && (
        <div className="production-slider">
          <div className="slider-header">
            <span className="slider-label">Production</span>
            <span className="slider-value">{Math.round(factor * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={10}
            value={Math.round(factor * 100)}
            onChange={(e) => {
              const v = parseInt(e.target.value) / 100;
              setProductionFactor(planet.id, data.id, v);
            }}
            className="slider-input"
          />
        </div>
      )}

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
        {isBuilding ? 'Annuler' : locked ? 'Verrouille' : canBuild ? `Construire niv. ${nextLevel}` : !affordable ? 'Ressources insuffisantes' : 'Indisponible'}
      </button>
    </div>
  );
}

export function Buildings() {
  const planet = useGameStore((s) => s.currentPlanet)();

  if (!planet) return <div>Aucune planete selectionnee</div>;

  return (
    <div className="buildings-page">
      <div className="page-header">
        <h2>Batiments</h2>
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
