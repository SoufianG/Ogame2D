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
import { computeNextLevelPreview, hasProductionSlider, computeRawProductionDelta } from '../utils/production';

// Ressource produite par chaque producteur (pour n'afficher que celle-ci dans l'apercu)
const PRODUCED_RESOURCE: Partial<Record<string, 'metal' | 'crystal' | 'deuterium'>> = {
  metalMine: 'metal',
  crystalMine: 'crystal',
  deuteriumSynthesizer: 'deuterium',
};

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

  const showSlider = hasProductionSlider(data.id);
  const factor = (planet.productionFactors?.[data.id] ?? 1);
  const preview = computeNextLevelPreview(planet, data.id);
  const producedResource = PRODUCED_RESOURCE[data.id];

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

      {/* Apercu prochain niveau : production du batiment + delta energie */}
      {(() => {
        // Production propre (sans efficacite, sans multiplicateur) pour n'afficher que ce que le batiment apporte reellement
        const rawDelta = producedResource ? computeRawProductionDelta(data.id, planet) : 0;
        const energyDelta = preview.deltaEnergyBalance;
        if (rawDelta === 0 && energyDelta === 0) return null;
        const resIcon = producedResource === 'metal' ? '/assets/fer.png' : producedResource === 'crystal' ? '/assets/cristal.png' : producedResource === 'deuterium' ? '/assets/deuterium.png' : null;
        return (
          <div className="building-preview">
            <span className="preview-label">Niv. {nextLevel} :</span>
            {resIcon && rawDelta !== 0 && (
              <span className="preview-delta positive">
                <img src={resIcon} alt="" className="cost-icon" /> {rawDelta > 0 ? '+' : ''}{formatNumber(rawDelta)}/h
              </span>
            )}
            {energyDelta !== 0 && (
              <span className={`preview-delta ${energyDelta < 0 ? 'negative' : 'positive'}`}>
                ⚡ {energyDelta > 0 ? '+' : ''}{formatNumber(energyDelta)}
              </span>
            )}
          </div>
        );
      })()}

      {/* Slider production 0-100% pour les producteurs */}
      {showSlider && (
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
