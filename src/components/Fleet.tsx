import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { SHIPS_DATA } from '../data/ships';
import type { ShipType, MissionType } from '../types/fleet';
import { formatNumber, formatTime } from '../utils/format';

type FleetStep = 'select' | 'destination' | 'mission' | 'cargo' | 'confirm';

const MISSION_LABELS: Record<MissionType, string> = {
  attack: 'Attaquer',
  transport: 'Transport',
  deploy: 'Stationner',
  espionage: 'Espionner',
  colonize: 'Coloniser',
  recycle: 'Recycler',
  station: 'Stationner',
  missileAttack: 'Missile',
  jumpGate: 'Portail',
};

export function Fleet() {
  const planet = useGameStore((s) => s.currentPlanet)();
  const fleetMovements = useGameStore((s) => s.fleetMovements);
  const sendFleet = useGameStore((s) => s.sendFleet);
  const pendingFleetTarget = useGameStore((s) => s.pendingFleetTarget);
  const setPendingFleetTarget = useGameStore((s) => s.setPendingFleetTarget);

  const [step, setStep] = useState<FleetStep>('select');
  const [selected, setSelected] = useState<Partial<Record<ShipType, number>>>({});
  const [destination, setDestination] = useState({ galaxy: 1, system: 1, position: 1 });
  const [mission, setMission] = useState<MissionType>('attack');
  const [speed, setSpeed] = useState(100);
  const [cargo, setCargo] = useState({ metal: 0, crystal: 0, deuterium: 0 });
  const [sending, setSending] = useState(false);

  // Pre-remplir depuis la galaxie si une cible a ete definie
  useEffect(() => {
    if (pendingFleetTarget) {
      setDestination(pendingFleetTarget.destination);
      setMission(pendingFleetTarget.mission);
      setStep('select');
      setPendingFleetTarget(null);
    }
  }, [pendingFleetTarget, setPendingFleetTarget]);

  if (!planet) return <div>Aucune planete selectionnee</div>;

  const availableShips = Object.entries(planet.ships || {}).filter(([, count]) => count! > 0);
  const hasSelected = Object.values(selected).some((v) => v! > 0);

  const handleSend = async () => {
    setSending(true);
    const cargoToSend = (mission === 'transport' || mission === 'deploy')
      ? cargo : { metal: 0, crystal: 0, deuterium: 0 };
    const ok = await sendFleet(planet.id, destination, selected, mission, speed, cargoToSend);
    setSending(false);
    if (ok) {
      setSelected({});
      setCargo({ metal: 0, crystal: 0, deuterium: 0 });
      setStep('select');
    }
  };

  const totalSelected = Object.values(selected).reduce((a, b) => a + (b || 0), 0);

  // Calcul du cargo total
  const totalCargo = Object.entries(selected).reduce((sum, [type, count]) => {
    const data = SHIPS_DATA[type as ShipType];
    return sum + (data?.cargo || 0) * (count || 0);
  }, 0);

  const totalCargoUsed = cargo.metal + cargo.crystal + cargo.deuterium;
  const cargoFree = totalCargo - totalCargoUsed;

  // Missions qui supportent le cargo
  const missionHasCargo = mission === 'transport' || mission === 'deploy';

  // Determiner l'etape suivante apres mission
  const nextAfterMission = () => {
    if (missionHasCargo && totalCargo > 0) {
      setStep('cargo');
    } else {
      setStep('confirm');
    }
  };

  return (
    <div className="buildings-page">
      <div className="page-header">
        <h2>Flotte</h2>
        <span className="slots-info">
          {planet.coordinates.galaxy}:{planet.coordinates.system}:{planet.coordinates.position}
        </span>
      </div>

      {/* Flottes en mouvement */}
      {fleetMovements.length > 0 && (
        <div className="building-category">
          <h3 className="category-title">Flottes en mouvement ({fleetMovements.length})</h3>
          <div className="fleet-movements">
            {fleetMovements.map((fm) => {
              const now = Date.now();
              const isReturning = fm.returnTime && now >= fm.arrivalTime;
              const totalTime = isReturning
                ? fm.returnTime! - fm.arrivalTime
                : fm.arrivalTime - fm.departureTime;
              const elapsed = isReturning
                ? now - fm.arrivalTime
                : now - fm.departureTime;
              const progress = Math.min(100, (elapsed / totalTime) * 100);
              const remaining = isReturning
                ? Math.max(0, Math.floor((fm.returnTime! - now) / 1000))
                : Math.max(0, Math.floor((fm.arrivalTime - now) / 1000));
              const totalShips = Object.values(fm.ships).reduce((a, b) => a + b!, 0);
              const hasCargo = fm.cargo && (fm.cargo.metal > 0 || fm.cargo.crystal > 0 || fm.cargo.deuterium > 0);

              return (
                <div key={fm.id} className="building-card">
                  <div className="building-header">
                    <div className="building-title">
                      <h3>{MISSION_LABELS[fm.mission] || fm.mission}</h3>
                      <span className="fleet-route">
                        [{fm.origin.galaxy}:{fm.origin.system}:{fm.origin.position}]
                        {isReturning ? ' \u2190 ' : ' \u2192 '}
                        [{fm.destination.galaxy}:{fm.destination.system}:{fm.destination.position}]
                      </span>
                    </div>
                  </div>
                  <div className="unit-stats">
                    <span>{totalShips} vaisseau{totalShips > 1 ? 'x' : ''}</span>
                    <span>{isReturning ? 'Retour' : 'Aller'}</span>
                    <span>{formatTime(remaining)}</span>
                  </div>
                  {hasCargo && (
                    <div className="unit-stats" style={{ fontSize: '0.8em', opacity: 0.8 }}>
                      {fm.cargo.metal > 0 && <span>Fe {formatNumber(fm.cargo.metal)}</span>}
                      {fm.cargo.crystal > 0 && <span>Cr {formatNumber(fm.cargo.crystal)}</span>}
                      {fm.cargo.deuterium > 0 && <span>De {formatNumber(fm.cargo.deuterium)}</span>}
                    </div>
                  )}
                  <div className="timer-bar">
                    <div className="timer-fill" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Etape 1 : Selection des vaisseaux */}
      {step === 'select' && (
        <div className="building-category">
          <h3 className="category-title">Selectionner les vaisseaux</h3>
          {availableShips.length === 0 ? (
            <div className="building-card">
              <p className="building-desc">
                Aucun vaisseau disponible. Construisez des vaisseaux au Chantier Naval.
              </p>
            </div>
          ) : (
            <div className="building-grid">
              {availableShips.map(([type, count]) => {
                const data = SHIPS_DATA[type as ShipType];
                const sel = selected[type as ShipType] || 0;
                return (
                  <div key={type} className="building-card">
                    <div className="building-header">
                      <div className="building-title">
                        <h3>{data?.name || type}</h3>
                        <span className="building-level">x{count}</span>
                      </div>
                    </div>
                    <div className="unit-stats">
                      <span>Att: {data?.attack}</span>
                      <span>Bouclier: {data?.shield}</span>
                      {data?.cargo !== undefined && <span>Cargo: {formatNumber(data.cargo)}</span>}
                    </div>
                    <div className="quantity-input">
                      <input
                        type="number"
                        min={0}
                        max={count!}
                        value={sel}
                        onChange={(e) => {
                          const v = Math.max(0, Math.min(count!, parseInt(e.target.value) || 0));
                          setSelected((s) => ({ ...s, [type]: v }));
                        }}
                      />
                      <button
                        className="build-btn ready"
                        onClick={() => setSelected((s) => ({ ...s, [type]: count! }))}
                      >
                        Tous
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {hasSelected && (
            <div className="fleet-actions">
              <div className="fleet-summary">
                <span>{totalSelected} vaisseau{totalSelected > 1 ? 'x' : ''}</span>
                <span>Cargo: {formatNumber(totalCargo)}</span>
              </div>
              <button className="build-btn ready" onClick={() => setStep('destination')}>
                Suivant
              </button>
            </div>
          )}
        </div>
      )}

      {/* Etape 2 : Destination */}
      {step === 'destination' && (
        <div className="building-category">
          <h3 className="category-title">Destination</h3>
          <div className="building-card">
            <div className="fleet-destination">
              <label>
                Galaxie
                <input
                  type="number"
                  min={1}
                  max={1}
                  value={destination.galaxy}
                  onChange={(e) => setDestination((d) => ({ ...d, galaxy: parseInt(e.target.value) || 1 }))}
                />
              </label>
              <label>
                Systeme
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={destination.system}
                  onChange={(e) => setDestination((d) => ({ ...d, system: Math.max(1, Math.min(50, parseInt(e.target.value) || 1)) }))}
                />
              </label>
              <label>
                Position
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={destination.position}
                  onChange={(e) => setDestination((d) => ({ ...d, position: Math.max(1, Math.min(15, parseInt(e.target.value) || 1)) }))}
                />
              </label>
            </div>
            <div className="fleet-speed">
              <label>Vitesse: {speed}%</label>
              <input
                type="range"
                min={10}
                max={100}
                step={10}
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value))}
              />
            </div>
          </div>
          <div className="fleet-actions">
            <button className="build-btn" onClick={() => setStep('select')}>Retour</button>
            <button className="build-btn ready" onClick={() => setStep('mission')}>Suivant</button>
          </div>
        </div>
      )}

      {/* Etape 3 : Mission */}
      {step === 'mission' && (
        <div className="building-category">
          <h3 className="category-title">Mission</h3>
          <div className="building-card">
            <div className="fleet-missions">
              {(['attack', 'espionage', 'transport', 'recycle', 'colonize'] as MissionType[]).map((m) => {
                const disabled =
                  (m === 'espionage' && !selected.espionageProbe) ||
                  (m === 'colonize' && !selected.colonyShip) ||
                  (m === 'recycle' && !selected.recycler);
                return (
                  <button
                    key={m}
                    className={`mission-btn ${mission === m ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                    disabled={disabled}
                    onClick={() => setMission(m)}
                  >
                    {MISSION_LABELS[m]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="fleet-actions">
            <button className="build-btn" onClick={() => setStep('destination')}>Retour</button>
            <button className="build-btn ready" onClick={nextAfterMission}>Suivant</button>
          </div>
        </div>
      )}

      {/* Etape 3b : Cargo (transport/stationner uniquement) */}
      {step === 'cargo' && (
        <div className="building-category">
          <h3 className="category-title">Chargement</h3>
          <div className="building-card">
            <div className="fleet-cargo-info">
              <span>Capacite : {formatNumber(totalCargo)}</span>
              <span>Libre : {formatNumber(Math.max(0, cargoFree))}</span>
            </div>
            <div className="fleet-cargo-inputs">
              <label>
                <img src="/assets/fer.png" alt="" className="cost-icon" /> Metal
                <input
                  type="number"
                  min={0}
                  max={Math.floor(planet.resources.metal)}
                  value={cargo.metal}
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(Math.floor(planet.resources.metal), parseInt(e.target.value) || 0));
                    setCargo((c) => ({ ...c, metal: v }));
                  }}
                />
                <span className="cargo-avail">/ {formatNumber(Math.floor(planet.resources.metal))}</span>
              </label>
              <label>
                <img src="/assets/cristal.png" alt="" className="cost-icon" /> Cristal
                <input
                  type="number"
                  min={0}
                  max={Math.floor(planet.resources.crystal)}
                  value={cargo.crystal}
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(Math.floor(planet.resources.crystal), parseInt(e.target.value) || 0));
                    setCargo((c) => ({ ...c, crystal: v }));
                  }}
                />
                <span className="cargo-avail">/ {formatNumber(Math.floor(planet.resources.crystal))}</span>
              </label>
              <label>
                <img src="/assets/deuterium.png" alt="" className="cost-icon" /> Deuterium
                <input
                  type="number"
                  min={0}
                  max={Math.floor(planet.resources.deuterium)}
                  value={cargo.deuterium}
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(Math.floor(planet.resources.deuterium), parseInt(e.target.value) || 0));
                    setCargo((c) => ({ ...c, deuterium: v }));
                  }}
                />
                <span className="cargo-avail">/ {formatNumber(Math.floor(planet.resources.deuterium))}</span>
              </label>
            </div>
            {totalCargoUsed > totalCargo && (
              <p className="insufficient">Cargo depasse la capacite !</p>
            )}
            <div className="fleet-cargo-quick">
              <button className="build-btn" onClick={() => {
                // Remplir tout le cargo proportionnellement
                const total = Math.floor(planet.resources.metal) + Math.floor(planet.resources.crystal) + Math.floor(planet.resources.deuterium);
                if (total <= 0) return;
                const cap = totalCargo;
                if (total <= cap) {
                  setCargo({ metal: Math.floor(planet.resources.metal), crystal: Math.floor(planet.resources.crystal), deuterium: Math.floor(planet.resources.deuterium) });
                } else {
                  const ratio = cap / total;
                  setCargo({
                    metal: Math.floor(Math.floor(planet.resources.metal) * ratio),
                    crystal: Math.floor(Math.floor(planet.resources.crystal) * ratio),
                    deuterium: Math.floor(Math.floor(planet.resources.deuterium) * ratio),
                  });
                }
              }}>
                Tout charger
              </button>
              <button className="build-btn" onClick={() => setCargo({ metal: 0, crystal: 0, deuterium: 0 })}>
                Vider
              </button>
            </div>
          </div>
          <div className="fleet-actions">
            <button className="build-btn" onClick={() => setStep('mission')}>Retour</button>
            <button
              className="build-btn ready"
              onClick={() => setStep('confirm')}
              disabled={totalCargoUsed > totalCargo}
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* Etape 4 : Confirmation */}
      {step === 'confirm' && (
        <div className="building-category">
          <h3 className="category-title">Confirmation</h3>
          <div className="building-card">
            <div className="fleet-confirm">
              <p><strong>Mission :</strong> {MISSION_LABELS[mission]}</p>
              <p>
                <strong>Destination :</strong> [{destination.galaxy}:{destination.system}:{destination.position}]
              </p>
              <p><strong>Vitesse :</strong> {speed}%</p>
              <p><strong>Vaisseaux :</strong></p>
              <ul className="fleet-ship-list">
                {Object.entries(selected).filter(([, c]) => c! > 0).map(([type, count]) => (
                  <li key={type}>
                    {SHIPS_DATA[type as ShipType]?.name || type}: {count}
                  </li>
                ))}
              </ul>
              {missionHasCargo && totalCargoUsed > 0 && (
                <>
                  <p><strong>Cargo :</strong></p>
                  <div className="unit-stats">
                    {cargo.metal > 0 && <span>Fe {formatNumber(cargo.metal)}</span>}
                    {cargo.crystal > 0 && <span>Cr {formatNumber(cargo.crystal)}</span>}
                    {cargo.deuterium > 0 && <span>De {formatNumber(cargo.deuterium)}</span>}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="fleet-actions">
            <button className="build-btn" onClick={() => missionHasCargo ? setStep('cargo') : setStep('mission')}>
              Retour
            </button>
            <button className="build-btn ready" onClick={handleSend} disabled={sending}>
              {sending ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
