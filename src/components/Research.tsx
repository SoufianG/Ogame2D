import { useGameStore } from '../store/gameStore';
import {
  RESEARCH_CATEGORIES,
  getResearchForCategory,
  getResearchCost,
  getResearchTime,
} from '../data/research';
import type { ResearchData } from '../data/research';
import { checkPrerequisites, canAfford } from '../utils/prerequisites';
import { formatNumber, formatTime } from '../utils/format';

function ResearchCard({ data }: { data: ResearchData }) {
  const planet = useGameStore((s) => s.currentPlanet)();
  const research = useGameStore((s) => s.research);
  const researchQueue = useGameStore((s) => s.researchQueue);
  const startResearch = useGameStore((s) => s.startResearch);
  const cancelResearch = useGameStore((s) => s.cancelResearch);

  if (!planet) return null;

  const currentLevel = research[data.id];
  const nextLevel = currentLevel + 1;
  const cost = getResearchCost(data, nextLevel);
  const time = getResearchTime(cost, planet.buildings.researchLab);
  const missing = checkPrerequisites(data.prerequisites, planet, research);
  const affordable = canAfford(cost, planet.resources);
  const isResearching = researchQueue?.research === data.id;
  const queueBusy = researchQueue !== null;
  const hasLab = planet.buildings.researchLab >= 1;

  const locked = missing.length > 0 || !hasLab;
  const canResearch = !locked && affordable && !queueBusy;

  const handleClick = async () => {
    if (isResearching) {
      await cancelResearch();
    } else if (canResearch) {
      await startResearch(planet.id, data.id);
    }
  };

  return (
    <div className={`building-card ${locked ? 'locked' : ''} ${isResearching ? 'building' : ''}`}>
      <div className="building-header">
        <div className="building-title">
          <h3>{data.name}</h3>
          <span className="building-level">Niv. {currentLevel}</span>
        </div>
      </div>

      <p className="building-desc">{data.description}</p>

      <div className="building-cost">
        {cost.metal > 0 && (
          <span className={planet.resources.metal >= cost.metal ? '' : 'insufficient'}>
            Fe {formatNumber(cost.metal)}
          </span>
        )}
        {cost.crystal > 0 && (
          <span className={planet.resources.crystal >= cost.crystal ? '' : 'insufficient'}>
            Cr {formatNumber(cost.crystal)}
          </span>
        )}
        {cost.deuterium > 0 && (
          <span className={planet.resources.deuterium >= cost.deuterium ? '' : 'insufficient'}>
            De {formatNumber(cost.deuterium)}
          </span>
        )}
        <span className="build-time">{formatTime(time)}</span>
      </div>

      {locked && (
        <div className="building-prereqs">
          {!hasLab && (
            <span className="prereq-missing">Laboratoire requis</span>
          )}
          {missing.map((m) => (
            <span key={m.id} className="prereq-missing">
              {m.id} niv. {m.required} (actuel: {m.current})
            </span>
          ))}
        </div>
      )}

      {isResearching && researchQueue && (
        <div className="building-timer">
          <div className="timer-bar">
            <div
              className="timer-fill"
              style={{
                width: `${((researchQueue.totalTime - researchQueue.remainingTime) / researchQueue.totalTime) * 100}%`,
              }}
            />
          </div>
          <span className="timer-text">
            Niv. {researchQueue.targetLevel} — {formatTime(researchQueue.remainingTime)}
          </span>
        </div>
      )}

      <button
        className={`build-btn ${isResearching ? 'cancel' : canResearch ? 'ready' : 'disabled'}`}
        onClick={handleClick}
        disabled={!canResearch && !isResearching}
      >
        {isResearching ? 'Annuler' : locked ? 'Verrouille' : canResearch ? `Rechercher niv. ${nextLevel}` : 'Ressources insuffisantes'}
      </button>
    </div>
  );
}

export function Research() {
  const planet = useGameStore((s) => s.currentPlanet)();

  if (!planet) return <div>Aucune planete selectionnee</div>;

  return (
    <div className="buildings-page">
      <div className="page-header">
        <h2>Recherche</h2>
        <span className="slots-info">
          Laboratoire niv. {planet.buildings.researchLab}
        </span>
      </div>

      {RESEARCH_CATEGORIES.map(({ key, label }) => {
        const items = getResearchForCategory(key);
        return (
          <div key={key} className="building-category">
            <h3 className="category-title">{label}</h3>
            <div className="building-grid">
              {items.map((r) => (
                <ResearchCard key={r.id} data={r} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
