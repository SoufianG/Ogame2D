import { useGameStore } from '../store/gameStore';
import { computeProduction } from '../utils/production';
import { formatNumber } from '../utils/format';

export function ResourceBar() {
  const currentPlanet = useGameStore((s) => s.currentPlanet)();

  if (!currentPlanet) return null;

  const { resources } = currentPlanet;
  const production = computeProduction(currentPlanet);

  return (
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
  );
}
