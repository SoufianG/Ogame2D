import { useGameStore } from '../store/gameStore';
import { RESEARCH_DATA } from '../data/research';
import type { ResearchType } from '../types/research';

// Position de chaque tech dans l'arbre (x, y en grille)
const TECH_POSITIONS: Record<ResearchType, { x: number; y: number }> = {
  // Ligne 0 : tech de base sans prereq recherche
  energyTech:       { x: 0, y: 0 },
  computerTech:     { x: 1, y: 0 },
  armourTech:       { x: 2, y: 0 },
  espionageTech:    { x: 3, y: 0 },

  // Ligne 1 : depend d'energie
  combustionDrive:  { x: 0, y: 1 },
  impulseDrive:     { x: 1, y: 1 },
  laserTech:        { x: 2, y: 1 },
  weaponsTech:      { x: 3, y: 1 },

  // Ligne 2
  shieldingTech:    { x: 0, y: 2 },
  ionTech:          { x: 2, y: 2 },
  astrophysics:     { x: 3, y: 2 },

  // Ligne 3
  hyperspaceDrive:  { x: 0, y: 3 },
  plasmaTech:       { x: 2, y: 3 },

  // Ligne 4
  intergalacticResearchNetwork: { x: 1, y: 4 },
  gravitonTech:     { x: 3, y: 4 },
};

interface TechNodeProps {
  techId: ResearchType;
  level: number;
  maxPrereqMet: boolean;
}

function TechNode({ techId, level, maxPrereqMet }: TechNodeProps) {
  const data = RESEARCH_DATA[techId];
  if (!data) return null;

  const isUnlocked = level > 0;
  const isAvailable = !isUnlocked && maxPrereqMet;

  let stateClass = 'tech-locked';
  if (isUnlocked) stateClass = 'tech-unlocked';
  else if (isAvailable) stateClass = 'tech-available';

  return (
    <div className={`tech-node ${stateClass}`} title={data.description}>
      <div className="tech-node-name">{data.name}</div>
      <div className="tech-node-level">
        {isUnlocked ? `Niv. ${level}` : isAvailable ? 'Disponible' : 'Verrouille'}
      </div>
    </div>
  );
}

// Dessiner une ligne SVG entre deux tech
function TechLink({ from, to, unlocked }: { from: ResearchType; to: ResearchType; unlocked: boolean }) {
  const posFrom = TECH_POSITIONS[from];
  const posTo = TECH_POSITIONS[to];
  if (!posFrom || !posTo) return null;

  const CELL_W = 180;
  const CELL_H = 100;
  const OFFSET_X = 90;
  const OFFSET_Y = 40;

  const x1 = posFrom.x * CELL_W + OFFSET_X;
  const y1 = posFrom.y * CELL_H + OFFSET_Y + 20;
  const x2 = posTo.x * CELL_W + OFFSET_X;
  const y2 = posTo.y * CELL_H + OFFSET_Y;

  return (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={unlocked ? 'rgba(72, 187, 120, 0.6)' : 'rgba(255, 255, 255, 0.15)'}
      strokeWidth={unlocked ? 2 : 1}
      strokeDasharray={unlocked ? 'none' : '4 4'}
    />
  );
}

export function TechTree() {
  const research = useGameStore((s) => s.research);
  const planet = useGameStore((s) => s.currentPlanet)();

  if (!planet) return <div>Aucune planete selectionnee</div>;

  const buildings = planet.buildings;

  // Verifier si les prereqs d'une tech sont remplis
  const arePrereqsMet = (techId: ResearchType): boolean => {
    const data = RESEARCH_DATA[techId];
    if (!data) return false;
    if (data.prerequisites.buildings) {
      for (const [b, lvl] of Object.entries(data.prerequisites.buildings)) {
        if ((buildings[b as keyof typeof buildings] || 0) < lvl) return false;
      }
    }
    if (data.prerequisites.research) {
      for (const [r, lvl] of Object.entries(data.prerequisites.research)) {
        if ((research[r as ResearchType] || 0) < lvl) return false;
      }
    }
    return true;
  };

  // Collecter tous les liens de prereqs recherche
  const links: { from: ResearchType; to: ResearchType; unlocked: boolean }[] = [];
  for (const [techId, data] of Object.entries(RESEARCH_DATA)) {
    if (data.prerequisites.research) {
      for (const reqTech of Object.keys(data.prerequisites.research)) {
        links.push({
          from: reqTech as ResearchType,
          to: techId as ResearchType,
          unlocked: research[techId as ResearchType] > 0,
        });
      }
    }
  }

  const CELL_W = 180;
  const CELL_H = 100;
  const SVG_W = 4 * CELL_W;
  const SVG_H = 5 * CELL_H + 20;

  return (
    <div className="buildings-page">
      <div className="page-header">
        <h2>Arbre Technologique</h2>
      </div>

      <div className="tech-tree-container">
        <svg className="tech-tree-svg" width={SVG_W} height={SVG_H}>
          {links.map((l, i) => (
            <TechLink key={i} from={l.from} to={l.to} unlocked={l.unlocked} />
          ))}
        </svg>

        <div className="tech-tree-nodes" style={{ width: SVG_W, height: SVG_H }}>
          {(Object.keys(TECH_POSITIONS) as ResearchType[]).map((techId) => {
            const pos = TECH_POSITIONS[techId];
            return (
              <div
                key={techId}
                className="tech-node-wrapper"
                style={{
                  left: pos.x * CELL_W + 10,
                  top: pos.y * CELL_H + 10,
                  width: CELL_W - 20,
                }}
              >
                <TechNode
                  techId={techId}
                  level={research[techId] || 0}
                  maxPrereqMet={arePrereqsMet(techId)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
