import { Router } from 'express';
import { getDb } from '../db/database.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Couts de base pour calcul de points
const BUILDING_POINT_FACTOR = 1; // 1 point par 1000 ressources investies
const RESEARCH_COSTS: Record<string, number> = {
  espionageTech: 1000, computerTech: 1000, weaponsTech: 2000,
  shieldingTech: 3000, armourTech: 2000, combustionDrive: 1500,
  impulseDrive: 3000, hyperspaceDrive: 5000, energyTech: 1500,
  laserTech: 1500, ionTech: 3000, plasmaTech: 5000,
  intergalacticResearchNetwork: 6000, astrophysics: 8000, gravitonTech: 0,
};

function calculatePoints(db: ReturnType<typeof getDb>, userId: string) {
  // Points economie : somme des couts de construction accumules
  const planets = db.prepare('SELECT buildings, ships, defenses FROM planets WHERE user_id = ?')
    .all(userId) as { buildings: string; ships: string; defenses: string }[];

  let economyPoints = 0;
  let militaryPoints = 0;

  for (const p of planets) {
    const buildings = JSON.parse(p.buildings) as Record<string, number>;
    // Chaque niveau de batiment = cout geometrique, on simplifie par ~level^1.5 * 100
    for (const [, level] of Object.entries(buildings)) {
      economyPoints += Math.floor(Math.pow(level, 1.5) * 100);
    }

    const ships = JSON.parse(p.ships) as Record<string, number>;
    for (const [, count] of Object.entries(ships)) {
      militaryPoints += count * 10;
    }

    const defenses = JSON.parse(p.defenses) as Record<string, number>;
    for (const [, count] of Object.entries(defenses)) {
      militaryPoints += count * 5;
    }
  }

  // Points recherche
  const researchRow = db.prepare('SELECT data FROM research WHERE user_id = ?').get(userId) as { data: string } | undefined;
  let researchPoints = 0;
  if (researchRow) {
    const research = JSON.parse(researchRow.data) as Record<string, number>;
    for (const [tech, level] of Object.entries(research)) {
      const baseCost = RESEARCH_COSTS[tech] || 1000;
      researchPoints += Math.floor(Math.pow(level, 1.5) * baseCost / 100);
    }
  }

  economyPoints = Math.floor(economyPoints * BUILDING_POINT_FACTOR);
  const totalPoints = economyPoints + researchPoints + militaryPoints;

  return { totalPoints, economyPoints, researchPoints, militaryPoints };
}

// GET /api/rankings — Classement general
router.get('/', (_req: AuthRequest, res) => {
  const db = getDb();

  // Recalculer pour tous les joueurs
  const users = db.prepare('SELECT id, username FROM users WHERE is_active = 1').all() as { id: string; username: string }[];

  const rankings = users.map((u) => {
    const points = calculatePoints(db, u.id);
    // Upsert dans le cache
    db.prepare(`
      INSERT INTO rankings (user_id, total_points, economy_points, research_points, military_points, updated_at)
      VALUES (?, ?, ?, ?, ?, unixepoch())
      ON CONFLICT(user_id) DO UPDATE SET
        total_points = excluded.total_points,
        economy_points = excluded.economy_points,
        research_points = excluded.research_points,
        military_points = excluded.military_points,
        updated_at = excluded.updated_at
    `).run(u.id, points.totalPoints, points.economyPoints, points.researchPoints, points.militaryPoints);

    return {
      username: u.username,
      ...points,
    };
  });

  // Trier par points totaux
  rankings.sort((a, b) => b.totalPoints - a.totalPoints);

  // Ajouter le rang
  const ranked = rankings.map((r, i) => ({ rank: i + 1, ...r }));

  res.json(ranked);
});

// GET /api/rankings/:category — Classement par categorie
router.get('/:category', (req: AuthRequest, res) => {
  const category = req.params.category as string;
  const validCategories = ['total', 'economy', 'research', 'military'];
  if (!validCategories.includes(category)) {
    res.status(400).json({ error: 'Categorie invalide' });
    return;
  }

  const db = getDb();
  const column = category === 'total' ? 'total_points'
    : category === 'economy' ? 'economy_points'
    : category === 'research' ? 'research_points'
    : 'military_points';

  const rankings = db.prepare(`
    SELECT u.username, r.total_points, r.economy_points, r.research_points, r.military_points
    FROM rankings r
    JOIN users u ON u.id = r.user_id
    ORDER BY r.${column} DESC
    LIMIT 100
  `).all() as Record<string, unknown>[];

  const ranked = rankings.map((r, i) => ({ rank: i + 1, ...r }));
  res.json(ranked);
});

export default router;
