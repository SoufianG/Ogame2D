import { useState, useEffect, useRef } from 'react';
import type { Biome } from '../types';
import type { SolarSystem, SystemSlot } from '../data/universe';

// === COULEURS ===
const STAR_COLORS: Record<string, { fill: string; glow: string }> = {
  yellow: { fill: '#fbbf24', glow: 'rgba(251, 191, 36, 0.4)' },
  red: { fill: '#ef4444', glow: 'rgba(239, 68, 68, 0.35)' },
  blue: { fill: '#60a5fa', glow: 'rgba(96, 165, 250, 0.35)' },
  orange: { fill: '#f97316', glow: 'rgba(249, 115, 22, 0.35)' },
  white: { fill: '#e2e8f0', glow: 'rgba(226, 232, 240, 0.3)' },
};

const BIOME_COLORS: Record<Biome, string> = {
  glacial: '#7dd3fc',
  tundra: '#94a3b8',
  temperate: '#34d399',
  arid: '#fbbf24',
  volcanic: '#ef4444',
};

// Vue isometrique : on ecrase l'axe Y pour l'effet de perspective
const ISO_SQUASH = 0.35;
const VIEW_WIDTH = 900;
const VIEW_HEIGHT = 500;
const CX = VIEW_WIDTH / 2;
const CY = VIEW_HEIGHT / 2;

interface Props {
  system: SolarSystem;
  onSlotClick?: (slot: SystemSlot) => void;
}

const POSITION_COUNT = 15;

// Vitesse orbitale : ralentie x5 pour les plus proches, x2 pour les plus lointaines
function orbitalSpeed(position: number): number {
  // Facteur de ralentissement : 5 pour pos 1, 2 pour pos 15
  const slowFactor = 5 - ((position - 1) / (POSITION_COUNT - 1)) * 3;
  const baseSpeed = 0.0003 + (POSITION_COUNT - position) * 0.00015;
  return baseSpeed / slowFactor;
}

// Respecter la preference systeme par defaut
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function SolarSystemView({ system, onSlotClick }: Props) {
  const [time, setTime] = useState(0);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [paused, setPaused] = useState(prefersReducedMotion);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (paused) {
      cancelAnimationFrame(animRef.current);
      return;
    }
    const animate = (ts: number) => {
      setTime(ts);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [paused]);

  const starColor = STAR_COLORS[system.starType] || STAR_COLORS.yellow;

  // Rayon d'orbite pour chaque position (ellipse en isometrique)
  // Offset de 80px pour eloigner toutes les planetes du soleil
  function orbitRadius(position: number): { rx: number; ry: number } {
    const base = 80 + position * 22;
    return { rx: base, ry: base * ISO_SQUASH };
  }

  // Position d'une planete sur son orbite
  function planetPosition(position: number): { x: number; y: number } {
    const { rx, ry } = orbitRadius(position);
    // Phase initiale deterministe par la position dans le systeme
    const seed = system.system * 100 + position;
    const phase = (seed * 2.399) % (Math.PI * 2);
    const angle = phase + time * orbitalSpeed(position);
    return {
      x: CX + Math.cos(angle) * rx,
      y: CY + Math.sin(angle) * ry,
    };
  }

  // Taille visuelle de la planete
  function planetRadius(size: number): number {
    return 4 + (size / 12) * 8;
  }

  const handleSlotClick = (slot: SystemSlot) => {
    setSelectedSlot(selectedSlot === slot.position ? null : slot.position);
    onSlotClick?.(slot);
  };

  return (
    <div className="solar-system-view">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="solar-system-svg"
      >
        {/* Fond etoile */}
        <defs>
          <radialGradient id="star-glow">
            <stop offset="0%" stopColor={starColor.glow} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="blur-glow">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Orbites (ellipses) */}
        {system.slots.map((slot) => {
          const { rx, ry } = orbitRadius(slot.position);
          return (
            <ellipse
              key={`orbit-${slot.position}`}
              cx={CX}
              cy={CY}
              rx={rx}
              ry={ry}
              fill="none"
              stroke="rgba(255, 255, 255, 0.06)"
              strokeWidth="1"
              strokeDasharray={slot.planet ? undefined : '3,6'}
            />
          );
        })}

        {/* Separer les planetes en "derriere" et "devant" le soleil */}
        {(() => {
          const slotsWithPos = system.slots
            .filter((s) => s.planet)
            .map((slot) => ({ slot, pos: planetPosition(slot.position) }))
            .sort((a, b) => a.pos.y - b.pos.y);

          const behind = slotsWithPos.filter((s) => s.pos.y <= CY);
          const inFront = slotsWithPos.filter((s) => s.pos.y > CY);

          const renderPlanet = ({ slot, pos }: { slot: typeof system.slots[0]; pos: { x: number; y: number } }) => {
            const r = planetRadius(slot.planet!.size);
            const color = BIOME_COLORS[slot.planet!.biome];
            const isHovered = hoveredSlot === slot.position;
            const isSelected = selectedSlot === slot.position;
            const isPlayer = slot.planet!.playerId === 'player';

            return (
              <g
                key={`planet-${slot.position}`}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredSlot(slot.position)}
                onMouseLeave={() => setHoveredSlot(null)}
                onClick={() => handleSlotClick(slot)}
              >
                {/* Glow de la planete */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r + 6}
                  fill={color}
                  opacity={isHovered || isSelected ? 0.3 : 0.1}
                  filter="url(#blur-glow)"
                />

                {/* Corps de la planete */}
                <circle cx={pos.x} cy={pos.y} r={r} fill={color} />
                {/* Highlight */}
                <circle
                  cx={pos.x - r * 0.25}
                  cy={pos.y - r * 0.25}
                  r={r * 0.45}
                  fill="white"
                  opacity={0.15}
                />
                {/* Ombre */}
                <circle
                  cx={pos.x + r * 0.15}
                  cy={pos.y + r * 0.15}
                  r={r}
                  fill="black"
                  opacity={0.15}
                />

                {/* Indicateur joueur */}
                {isPlayer && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={r + 3}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.5)"
                    strokeWidth="1.5"
                    strokeDasharray="3,3"
                  />
                )}

                {/* Lune */}
                {slot.moon && (
                  <circle
                    cx={pos.x + r + 5}
                    cy={pos.y - 3}
                    r={3}
                    fill="#94a3b8"
                  />
                )}

                {/* Debris */}
                {slot.debris && (
                  <g opacity={0.5}>
                    <circle cx={pos.x - r - 4} cy={pos.y + 2} r={1.5} fill="#a0a0a0" />
                    <circle cx={pos.x - r - 7} cy={pos.y - 1} r={1} fill="#808080" />
                    <circle cx={pos.x - r - 5} cy={pos.y + 5} r={1.2} fill="#909090" />
                  </g>
                )}

                {/* Indicateur NPC */}
                {slot.planet!.playerId && slot.planet!.playerId !== 'player' && (
                  <circle
                    cx={pos.x}
                    cy={pos.y - r - 5}
                    r={2}
                    fill="#f87171"
                    opacity={0.8}
                  />
                )}
              </g>
            );
          };

          return (
            <>
              {/* Planetes derriere le soleil */}
              {behind.map(renderPlanet)}

              {/* Slots vides derriere */}
              {system.slots
                .filter((s) => !s.planet)
                .filter((s) => planetPosition(s.position).y <= CY)
                .map((slot) => {
                  const pos = planetPosition(slot.position);
                  return (
                    <circle
                      key={`empty-${slot.position}`}
                      cx={pos.x}
                      cy={pos.y}
                      r={2}
                      fill="rgba(255, 255, 255, 0.1)"
                    />
                  );
                })}

              {/* Glow de l'etoile */}
              <circle cx={CX} cy={CY} r={50} fill="url(#star-glow)" />

              {/* Etoile centrale (au-dessus des planetes derriere) */}
              <circle cx={CX} cy={CY} r={18} fill={starColor.fill} />
              <circle cx={CX} cy={CY} r={18} fill="white" opacity={0.2} />
              <circle cx={CX - 5} cy={CY - 5} r={7} fill="white" opacity={0.25} />

              {/* Planetes devant le soleil */}
              {inFront.map(renderPlanet)}

              {/* Slots vides devant */}
              {system.slots
                .filter((s) => !s.planet)
                .filter((s) => planetPosition(s.position).y > CY)
                .map((slot) => {
                  const pos = planetPosition(slot.position);
                  return (
                    <circle
                      key={`empty-front-${slot.position}`}
                      cx={pos.x}
                      cy={pos.y}
                      r={2}
                      fill="rgba(255, 255, 255, 0.1)"
                    />
                  );
                })}
            </>
          );
        })()}
      </svg>

      {/* Tooltip / Infobulle */}
      {selectedSlot !== null && (() => {
        const slot = system.slots.find((s) => s.position === selectedSlot);
        if (!slot || !slot.planet) return null;
        const pos = planetPosition(slot.position);
        const planet = slot.planet;

        // Position de la bulle par rapport au SVG
        const tooltipX = (pos.x / VIEW_WIDTH) * 100;
        const tooltipY = (pos.y / VIEW_HEIGHT) * 100;
        const alignRight = tooltipX > 60;

        return (
          <div
            className="system-tooltip"
            style={{
              left: alignRight ? undefined : `${tooltipX + 3}%`,
              right: alignRight ? `${100 - tooltipX + 3}%` : undefined,
              top: `${Math.max(5, Math.min(70, tooltipY - 5))}%`,
            }}
          >
            <div className="tooltip-header">
              <span className="tooltip-name">{planet.name}</span>
              {planet.playerName && (
                <span className={`tooltip-owner ${planet.playerId === 'player' ? 'self' : 'enemy'}`}>
                  {planet.playerName}
                </span>
              )}
            </div>
            <div className="tooltip-stats">
              <span>Position {slot.position}</span>
              <span>{planet.temperature}°C</span>
              <span>Taille {planet.size}</span>
            </div>
            <div className="tooltip-indicators">
              {slot.moon && <span className="indicator moon">Lune</span>}
              {slot.debris && <span className="indicator debris">Debris</span>}
              {!planet.playerId && <span className="indicator free">Libre</span>}
            </div>
            <div className="tooltip-actions">
              {planet.playerId === 'player' ? (
                <button className="tooltip-btn">Voir la planete</button>
              ) : planet.playerId ? (
                <>
                  <button className="tooltip-btn">Espionner</button>
                  <button className="tooltip-btn attack">Attaquer</button>
                </>
              ) : (
                <button className="tooltip-btn">Coloniser</button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Toggle pause orbites */}
      <button
        className="orbit-toggle"
        onClick={() => setPaused((p) => !p)}
        title={paused ? 'Reprendre les orbites' : 'Mettre en pause les orbites'}
      >
        {paused ? '▶' : '⏸'}
      </button>
    </div>
  );
}
