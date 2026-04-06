import { useGameStore } from '../store/gameStore';
import { computeProduction, computeStorage } from '../utils/production';
import { formatNumber } from '../utils/format';

function StorageBar({ current, max }: { current: number; max: number }) {
  const ratio = max > 0 ? Math.min(current / max, 1) : 1;
  const full = ratio >= 1;
  return (
    <div className="storage-bar-track">
      <div
        className={`storage-bar-fill${full ? ' storage-full' : ''}`}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}

export function ResourceBar() {
  const currentPlanet = useGameStore((s) => s.currentPlanet)();

  if (!currentPlanet) return null;

  const { resources, buildings } = currentPlanet;
  const production = computeProduction(currentPlanet);

  const metalCap = computeStorage(buildings.metalStorage);
  const crystalCap = computeStorage(buildings.crystalStorage);
  const deutCap = computeStorage(buildings.deuteriumTank);

  const metalFull = resources.metal >= metalCap;
  const crystalFull = resources.crystal >= crystalCap;
  const deutFull = resources.deuterium >= deutCap;

  return (
    <div className="resources-bar">
      <div className="resource-item">
        <img src="/assets/fer.png" alt="Metal" className="resource-img" />
        <div className="resource-data">
          <span className="resource-label">Metal</span>
          <span className={`resource-value${metalFull ? ' resource-capped' : ''}`}>
            {formatNumber(resources.metal)} / {formatNumber(metalCap)}
          </span>
          <StorageBar current={resources.metal} max={metalCap} />
          <span className="resource-sub">+{formatNumber(production.metalPerHour)}/h</span>
        </div>
      </div>
      <div className="resource-item">
        <img src="/assets/cristal.png" alt="Cristal" className="resource-img" />
        <div className="resource-data">
          <span className="resource-label">Cristal</span>
          <span className={`resource-value${crystalFull ? ' resource-capped' : ''}`}>
            {formatNumber(resources.crystal)} / {formatNumber(crystalCap)}
          </span>
          <StorageBar current={resources.crystal} max={crystalCap} />
          <span className="resource-sub">+{formatNumber(production.crystalPerHour)}/h</span>
        </div>
      </div>
      <div className="resource-item">
        <img src="/assets/deuterium.png" alt="Deuterium" className="resource-img" />
        <div className="resource-data">
          <span className="resource-label">Deuterium</span>
          <span className={`resource-value${deutFull ? ' resource-capped' : ''}`}>
            {formatNumber(resources.deuterium)} / {formatNumber(deutCap)}
          </span>
          <StorageBar current={resources.deuterium} max={deutCap} />
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
