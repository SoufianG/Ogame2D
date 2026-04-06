import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { SHIPS_DATA, DEFENSES_DATA, getUnitTime } from '../data/ships';
import type { UnitData } from '../data/ships';
import { checkPrerequisites, canAfford } from '../utils/prerequisites';
import { formatNumber, formatTime } from '../utils/format';
import { apiBuildUnit, apiCancelShipyardQueue } from '../api/sync';

function ShipCard({ data }: { data: UnitData }) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
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
  const locked = missing.length > 0 || planet.buildings.shipyard < 1;
  const canBuild = !locked && affordable && quantity > 0 && !loading;

  const handleBuild = async () => {
    if (!canBuild) return;
    setLoading(true);
    await apiBuildUnit(planet.id, data.id, quantity);
    setLoading(false);
  };

  return (
    <div className={`building-card ${locked ? 'locked' : ''}`}>
      <div className="building-header">
        <img src="/assets/placeholder.png" alt="" className="card-icon" />
        <div className="building-title">
          <h3>{data.name}</h3>
        </div>
      </div>

      <p className="building-desc">{data.description}</p>

      <div className="unit-stats">
        <span>Att: {data.attack}</span>
        <span>Bouclier: {data.shield}</span>
        <span>Coque: {formatNumber(data.hull)}</span>
        {data.cargo !== undefined && <span>Cargo: {formatNumber(data.cargo)}</span>}
      </div>

      <div className="building-cost">
        {data.cost.metal > 0 && (
          <span className={planet.resources.metal >= totalCost.metal ? '' : 'insufficient'}>
            <img src="/assets/fer.png" alt="" className="cost-icon" /> {formatNumber(totalCost.metal)}
          </span>
        )}
        {data.cost.crystal > 0 && (
          <span className={planet.resources.crystal >= totalCost.crystal ? '' : 'insufficient'}>
            <img src="/assets/cristal.png" alt="" className="cost-icon" /> {formatNumber(totalCost.crystal)}
          </span>
        )}
        {data.cost.deuterium > 0 && (
          <span className={planet.resources.deuterium >= totalCost.deuterium ? '' : 'insufficient'}>
            <img src="/assets/deuterium.png" alt="" className="cost-icon" /> {formatNumber(totalCost.deuterium)}
          </span>
        )}
        <span className="build-time">{formatTime(unitTime * quantity)}</span>
      </div>

      {locked && (
        <div className="building-prereqs">
          {planet.buildings.shipyard < 1 && (
            <span className="prereq-missing">Chantier Naval requis</span>
          )}
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
            onClick={handleBuild}
          >
            {loading ? 'En cours...' : `Construire x${quantity}`}
          </button>
        </div>
      )}
    </div>
  );
}

function ShipyardQueue() {
  const planet = useGameStore((s) => s.currentPlanet)();
  const shipyardQueues = useGameStore((s) => s.shipyardQueues);

  if (!planet) return null;

  const queues = shipyardQueues[planet.id] || [];
  if (queues.length === 0) return null;

  const allUnits = { ...SHIPS_DATA, ...DEFENSES_DATA };

  return (
    <div className="building-category">
      <h3 className="category-title">File de construction</h3>
      <div className="shipyard-queue-list">
        {queues.map((q) => {
          const built = q.quantity - q.remaining;
          const progress = q.unitTime > 0 ? (q.elapsed / q.unitTime) * 100 : 0;

          return (
            <div key={q.id} className="activity-item building">
              <div className="activity-info">
                <span className="activity-label">
                  {allUnits[q.unitType as keyof typeof allUnits]?.name || q.unitType}
                </span>
                <span className="activity-detail">{built}/{q.quantity} construits</span>
              </div>
              <div className="activity-timer">
                <div className="timer-bar">
                  <div className="timer-fill" style={{ width: `${progress}%` }} />
                </div>
                <span className="timer-text">
                  {formatTime(Math.max(0, q.unitTime - q.elapsed))} / unite
                </span>
              </div>
              <button
                className="build-btn cancel"
                onClick={() => apiCancelShipyardQueue(planet.id, q.id)}
              >
                Annuler
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Shipyard() {
  const planet = useGameStore((s) => s.currentPlanet)();

  if (!planet) return <div>Aucune planete selectionnee</div>;

  const ships = Object.values(SHIPS_DATA);

  return (
    <div className="buildings-page">
      <div className="page-header">
        <h2>Chantier Naval</h2>
        <span className="slots-info">
          Chantier niv. {planet.buildings.shipyard}
        </span>
      </div>

      <ShipyardQueue />

      <div className="building-category">
        <h3 className="category-title">Vaisseaux Civils</h3>
        <div className="building-grid">
          {ships.filter((s) => ['smallCargo', 'largeCargo', 'recycler', 'espionageProbe', 'solarSatellite', 'colonyShip'].includes(s.id)).map((s) => (
            <ShipCard key={s.id} data={s} />
          ))}
        </div>
      </div>

      <div className="building-category">
        <h3 className="category-title">Vaisseaux Militaires</h3>
        <div className="building-grid">
          {ships.filter((s) => ['lightFighter', 'heavyFighter', 'cruiser', 'battleship', 'bomber', 'destroyer', 'deathstar'].includes(s.id)).map((s) => (
            <ShipCard key={s.id} data={s} />
          ))}
        </div>
      </div>
    </div>
  );
}
