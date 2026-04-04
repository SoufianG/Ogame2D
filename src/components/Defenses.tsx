import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { DEFENSES_DATA, getUnitTime } from '../data/ships';
import type { UnitData } from '../data/ships';
import { checkPrerequisites, canAfford } from '../utils/prerequisites';
import { formatNumber, formatTime } from '../utils/format';

function DefenseCard({ data }: { data: UnitData }) {
  const [quantity, setQuantity] = useState(1);
  const planet = useGameStore((s) => s.currentPlanet)();
  const research = useGameStore((s) => s.research);

  if (!planet) return null;

  const missing = checkPrerequisites(data.prerequisites, planet, research);
  const totalCost = {
    metal: data.cost.metal * quantity,
    crystal: data.cost.crystal * quantity,
    deuterium: data.cost.deuterium * quantity,
  };
  const affordable = canAfford(totalCost, planet.resources);
  const unitTime = getUnitTime(data.cost, planet.buildings.shipyard);
  const locked = missing.length > 0;
  const canBuild = !locked && affordable && quantity > 0;

  return (
    <div className={`building-card ${locked ? 'locked' : ''}`}>
      <div className="building-header">
        <div className="building-title">
          <h3>{data.name}</h3>
        </div>
      </div>

      <p className="building-desc">{data.description}</p>

      <div className="unit-stats">
        <span>Att: {formatNumber(data.attack)}</span>
        <span>Bouclier: {formatNumber(data.shield)}</span>
        <span>Coque: {formatNumber(data.hull)}</span>
      </div>

      <div className="building-cost">
        {data.cost.metal > 0 && (
          <span className={planet.resources.metal >= totalCost.metal ? '' : 'insufficient'}>
            Fe {formatNumber(totalCost.metal)}
          </span>
        )}
        {data.cost.crystal > 0 && (
          <span className={planet.resources.crystal >= totalCost.crystal ? '' : 'insufficient'}>
            Cr {formatNumber(totalCost.crystal)}
          </span>
        )}
        {data.cost.deuterium > 0 && (
          <span className={planet.resources.deuterium >= totalCost.deuterium ? '' : 'insufficient'}>
            De {formatNumber(totalCost.deuterium)}
          </span>
        )}
        <span className="build-time">{formatTime(unitTime * quantity)}</span>
      </div>

      {locked && (
        <div className="building-prereqs">
          {missing.map((m) => (
            <span key={m.id} className="prereq-missing">
              {m.id} niv. {m.required} (actuel: {m.current})
            </span>
          ))}
        </div>
      )}

      {!locked && (
        <div className="quantity-input">
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          />
          <button
            className={`build-btn ${canBuild ? 'ready' : 'disabled'}`}
            disabled={!canBuild}
          >
            Construire x{quantity}
          </button>
        </div>
      )}
    </div>
  );
}

export function Defenses() {
  const planet = useGameStore((s) => s.currentPlanet)();

  if (!planet) return <div>Aucune planete selectionnee</div>;

  const defenses = Object.values(DEFENSES_DATA);

  return (
    <div className="buildings-page">
      <div className="page-header">
        <h2>Defenses</h2>
        <span className="slots-info">
          Chantier niv. {planet.buildings.shipyard}
        </span>
      </div>

      <div className="building-category">
        <h3 className="category-title">Defenses Planetaires</h3>
        <div className="building-grid">
          {defenses.map((d) => (
            <DefenseCard key={d.id} data={d} />
          ))}
        </div>
      </div>
    </div>
  );
}
