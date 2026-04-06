import { Router } from 'express';
import { getDb } from '../db/database.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// === Definitions des achievements ===

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  category: 'economy' | 'military' | 'research' | 'exploration' | 'social';
  reward: { metal: number; crystal: number; deuterium: number };
  icon: string; // emoji
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // --- Economie ---
  { id: 'first_mine', name: 'Premiers Pas', description: 'Construire une mine de metal niveau 1', category: 'economy', reward: { metal: 500, crystal: 250, deuterium: 0 }, icon: '⛏' },
  { id: 'metal_mine_5', name: 'Mineur Amateur', description: 'Mine de metal niveau 5', category: 'economy', reward: { metal: 2000, crystal: 1000, deuterium: 0 }, icon: '⛏' },
  { id: 'metal_mine_10', name: 'Mineur Expert', description: 'Mine de metal niveau 10', category: 'economy', reward: { metal: 10000, crystal: 5000, deuterium: 0 }, icon: '⛏' },
  { id: 'crystal_mine_5', name: 'Cristallier', description: 'Mine de cristal niveau 5', category: 'economy', reward: { metal: 1000, crystal: 2000, deuterium: 0 }, icon: '💎' },
  { id: 'deut_synth_5', name: 'Chimiste', description: 'Synthetiseur de deuterium niveau 5', category: 'economy', reward: { metal: 1000, crystal: 1000, deuterium: 2000 }, icon: '🧪' },
  { id: 'storage_full', name: 'Coffre-fort', description: 'Avoir un hangar de metal ou cristal niveau 5', category: 'economy', reward: { metal: 3000, crystal: 3000, deuterium: 0 }, icon: '🏦' },
  { id: 'rich_10k', name: 'Prospere', description: 'Accumuler 10 000 de chaque ressource', category: 'economy', reward: { metal: 5000, crystal: 5000, deuterium: 2000 }, icon: '💰' },
  { id: 'rich_100k', name: 'Magnat', description: 'Accumuler 100 000 de chaque ressource', category: 'economy', reward: { metal: 20000, crystal: 20000, deuterium: 10000 }, icon: '👑' },
  { id: 'solar_plant_5', name: 'Electricien', description: 'Centrale solaire niveau 5', category: 'economy', reward: { metal: 1500, crystal: 1500, deuterium: 0 }, icon: '☀' },

  // --- Militaire ---
  { id: 'first_ship', name: 'Premier Vol', description: 'Construire votre premier vaisseau', category: 'military', reward: { metal: 1000, crystal: 500, deuterium: 0 }, icon: '🚀' },
  { id: 'fleet_10', name: 'Escadre', description: 'Avoir 10 vaisseaux', category: 'military', reward: { metal: 5000, crystal: 3000, deuterium: 1000 }, icon: '🛸' },
  { id: 'fleet_50', name: 'Flotte de Guerre', description: 'Avoir 50 vaisseaux', category: 'military', reward: { metal: 20000, crystal: 15000, deuterium: 5000 }, icon: '⚔' },
  { id: 'first_defense', name: 'Forteresse', description: 'Construire votre premiere defense', category: 'military', reward: { metal: 1000, crystal: 500, deuterium: 0 }, icon: '🛡' },
  { id: 'defense_20', name: 'Bunker', description: 'Avoir 20 defenses', category: 'military', reward: { metal: 10000, crystal: 5000, deuterium: 2000 }, icon: '🏰' },
  { id: 'first_attack', name: 'Agresseur', description: 'Lancer votre premiere attaque', category: 'military', reward: { metal: 3000, crystal: 2000, deuterium: 1000 }, icon: '💥' },
  { id: 'combat_winner', name: 'Vainqueur', description: 'Remporter un combat', category: 'military', reward: { metal: 10000, crystal: 8000, deuterium: 3000 }, icon: '🏆' },
  { id: 'shipyard_5', name: 'Industriel', description: 'Chantier naval niveau 5', category: 'military', reward: { metal: 5000, crystal: 3000, deuterium: 1000 }, icon: '🔧' },

  // --- Recherche ---
  { id: 'first_research', name: 'Eureka !', description: 'Completer votre premiere recherche', category: 'research', reward: { metal: 500, crystal: 500, deuterium: 500 }, icon: '🔬' },
  { id: 'research_5', name: 'Scientifique', description: 'Avoir 5 recherches completees', category: 'research', reward: { metal: 5000, crystal: 5000, deuterium: 3000 }, icon: '🧬' },
  { id: 'research_10', name: 'Genie', description: 'Avoir 10 recherches completees', category: 'research', reward: { metal: 15000, crystal: 15000, deuterium: 8000 }, icon: '🧠' },
  { id: 'hyperspace', name: 'Explorateur Galactique', description: 'Debloquer la Propulsion Hyperespace', category: 'research', reward: { metal: 20000, crystal: 20000, deuterium: 10000 }, icon: '🌌' },
  { id: 'plasma', name: 'Maitre du Plasma', description: 'Debloquer la Physique des Plasmas', category: 'research', reward: { metal: 10000, crystal: 10000, deuterium: 5000 }, icon: '⚡' },
  { id: 'lab_10', name: 'Chercheur Elite', description: 'Laboratoire niveau 10', category: 'research', reward: { metal: 15000, crystal: 15000, deuterium: 10000 }, icon: '🏛' },

  // --- Exploration ---
  { id: 'first_espionage', name: 'Espion', description: 'Envoyer votre premiere mission d\'espionnage', category: 'exploration', reward: { metal: 1000, crystal: 1000, deuterium: 500 }, icon: '🕵' },
  { id: 'first_colony', name: 'Colonisateur', description: 'Coloniser votre premiere planete', category: 'exploration', reward: { metal: 10000, crystal: 10000, deuterium: 5000 }, icon: '🌍' },
  { id: 'colonies_3', name: 'Empire Naissant', description: 'Avoir 3 planetes', category: 'exploration', reward: { metal: 25000, crystal: 25000, deuterium: 15000 }, icon: '🪐' },
  { id: 'first_recycle', name: 'Recycleur', description: 'Collecter des debris', category: 'exploration', reward: { metal: 3000, crystal: 3000, deuterium: 0 }, icon: '♻' },
  { id: 'first_transport', name: 'Transporteur', description: 'Livrer des ressources', category: 'exploration', reward: { metal: 2000, crystal: 2000, deuterium: 1000 }, icon: '📦' },

  // --- Social ---
  { id: 'first_message', name: 'Sociable', description: 'Envoyer votre premier message prive', category: 'social', reward: { metal: 500, crystal: 500, deuterium: 0 }, icon: '💬' },
  { id: 'join_alliance', name: 'Allie', description: 'Rejoindre ou creer une alliance', category: 'social', reward: { metal: 3000, crystal: 3000, deuterium: 1000 }, icon: '🤝' },
  { id: 'create_alliance', name: 'Fondateur', description: 'Creer une alliance', category: 'social', reward: { metal: 5000, crystal: 5000, deuterium: 2000 }, icon: '🏴' },
];

const ACHIEVEMENT_MAP = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

// === Verifier et debloquer les achievements pour un joueur ===

export function checkAchievements(userId: string) {
  const db = getDb();

  // Charger les achievements deja debloques
  const unlocked = new Set(
    (db.prepare('SELECT achievement_id FROM achievements WHERE user_id = ?').all(userId) as { achievement_id: string }[])
      .map((r) => r.achievement_id),
  );

  const newlyUnlocked: string[] = [];

  // Charger les donnees du joueur
  const planets = db.prepare('SELECT * FROM planets WHERE user_id = ?').all(userId) as {
    buildings: string; ships: string; defenses: string; metal: number; crystal: number; deuterium: number;
  }[];

  const researchRow = db.prepare('SELECT data FROM research WHERE user_id = ?').get(userId) as { data: string } | undefined;
  const research = researchRow ? JSON.parse(researchRow.data) as Record<string, number> : {};

  const allianceMember = db.prepare('SELECT alliance_id FROM alliance_members WHERE user_id = ?').get(userId);
  const allianceLeader = db.prepare('SELECT id FROM alliances WHERE leader_id = ?').get(userId);
  const sentMessages = db.prepare('SELECT COUNT(*) as c FROM private_messages WHERE from_user_id = ?').get(userId) as { c: number };

  // Flottes (missions envoyees)
  const fleetAttacks = db.prepare("SELECT COUNT(*) as c FROM fleet_movements WHERE user_id = ? AND mission = 'attack'").get(userId) as { c: number };
  const fleetEspionage = db.prepare("SELECT COUNT(*) as c FROM fleet_movements WHERE user_id = ? AND mission = 'espionage'").get(userId) as { c: number };
  const fleetTransport = db.prepare("SELECT COUNT(*) as c FROM fleet_movements WHERE user_id = ? AND mission = 'transport'").get(userId) as { c: number };
  const fleetRecycle = db.prepare("SELECT COUNT(*) as c FROM fleet_movements WHERE user_id = ? AND mission = 'recycle'").get(userId) as { c: number };

  // Messages de victoire
  const combatWins = db.prepare("SELECT COUNT(*) as c FROM messages WHERE user_id = ? AND type = 'combat' AND body LIKE '%Vainqueur: Attaquant%'").get(userId) as { c: number };

  // Agreger les donnees de toutes les planetes
  let maxMetalMine = 0, maxCrystalMine = 0, maxDeutSynth = 0, maxSolarPlant = 0;
  let maxStorage = 0, maxShipyard = 0, maxLab = 0;
  let totalShips = 0, totalDefenses = 0;
  let allRich10k = false, allRich100k = false;

  for (const p of planets) {
    const b = JSON.parse(p.buildings) as Record<string, number>;
    const s = JSON.parse(p.ships) as Record<string, number>;
    const d = JSON.parse(p.defenses) as Record<string, number>;

    maxMetalMine = Math.max(maxMetalMine, b.metalMine || 0);
    maxCrystalMine = Math.max(maxCrystalMine, b.crystalMine || 0);
    maxDeutSynth = Math.max(maxDeutSynth, b.deuteriumSynthesizer || 0);
    maxSolarPlant = Math.max(maxSolarPlant, b.solarPlant || 0);
    maxStorage = Math.max(maxStorage, b.metalStorage || 0, b.crystalStorage || 0);
    maxShipyard = Math.max(maxShipyard, b.shipyard || 0);
    maxLab = Math.max(maxLab, b.researchLab || 0);

    totalShips += Object.values(s).reduce((a, c) => a + c, 0);
    totalDefenses += Object.values(d).reduce((a, c) => a + c, 0);

    if (p.metal >= 10000 && p.crystal >= 10000 && p.deuterium >= 10000) allRich10k = true;
    if (p.metal >= 100000 && p.crystal >= 100000 && p.deuterium >= 100000) allRich100k = true;
  }

  const totalResearch = Object.values(research).filter((v) => v > 0).length;

  // Verifier chaque achievement
  const checks: [string, boolean][] = [
    // Economie
    ['first_mine', maxMetalMine >= 1],
    ['metal_mine_5', maxMetalMine >= 5],
    ['metal_mine_10', maxMetalMine >= 10],
    ['crystal_mine_5', maxCrystalMine >= 5],
    ['deut_synth_5', maxDeutSynth >= 5],
    ['storage_full', maxStorage >= 5],
    ['rich_10k', allRich10k],
    ['rich_100k', allRich100k],
    ['solar_plant_5', maxSolarPlant >= 5],
    // Militaire
    ['first_ship', totalShips >= 1],
    ['fleet_10', totalShips >= 10],
    ['fleet_50', totalShips >= 50],
    ['first_defense', totalDefenses >= 1],
    ['defense_20', totalDefenses >= 20],
    ['first_attack', fleetAttacks.c >= 1],
    ['combat_winner', combatWins.c >= 1],
    ['shipyard_5', maxShipyard >= 5],
    // Recherche
    ['first_research', totalResearch >= 1],
    ['research_5', totalResearch >= 5],
    ['research_10', totalResearch >= 10],
    ['hyperspace', (research.hyperspaceDrive || 0) >= 1],
    ['plasma', (research.plasmaTech || 0) >= 1],
    ['lab_10', maxLab >= 10],
    // Exploration
    ['first_espionage', fleetEspionage.c >= 1],
    ['first_colony', planets.length >= 2],
    ['colonies_3', planets.length >= 3],
    ['first_recycle', fleetRecycle.c >= 1],
    ['first_transport', fleetTransport.c >= 1],
    // Social
    ['first_message', sentMessages.c >= 1],
    ['join_alliance', !!allianceMember],
    ['create_alliance', !!allianceLeader],
  ];

  const insertStmt = db.prepare('INSERT OR IGNORE INTO achievements (user_id, achievement_id) VALUES (?, ?)');

  for (const [id, condition] of checks) {
    if (condition && !unlocked.has(id)) {
      insertStmt.run(userId, id);
      newlyUnlocked.push(id);
    }
  }

  return newlyUnlocked;
}

// === GET /api/achievements — Liste des achievements du joueur ===
router.get('/', (req: AuthRequest, res) => {
  const db = getDb();
  const userId = req.user!.userId;

  // Verifier les nouveaux achievements
  checkAchievements(userId);

  const rows = db.prepare('SELECT achievement_id, unlocked_at, claimed FROM achievements WHERE user_id = ?').all(userId) as {
    achievement_id: string; unlocked_at: number; claimed: number;
  }[];

  const unlockedMap = new Map(rows.map((r) => [r.achievement_id, r]));

  const result = ACHIEVEMENTS.map((a) => {
    const row = unlockedMap.get(a.id);
    return {
      ...a,
      unlocked: !!row,
      unlockedAt: row?.unlocked_at || null,
      claimed: row?.claimed === 1,
    };
  });

  res.json(result);
});

// === POST /api/achievements/claim/:id — Reclamer la recompense ===
router.post('/claim/:id', (req: AuthRequest, res) => {
  const db = getDb();
  const userId = req.user!.userId;
  const achievementId = req.params.id as string;

  const def = ACHIEVEMENT_MAP.get(achievementId);
  if (!def) {
    res.status(404).json({ error: 'Achievement inconnu' });
    return;
  }

  const row = db.prepare('SELECT claimed FROM achievements WHERE user_id = ? AND achievement_id = ?').get(userId, achievementId) as { claimed: number } | undefined;
  if (!row) {
    res.status(400).json({ error: 'Achievement non debloque' });
    return;
  }
  if (row.claimed) {
    res.status(400).json({ error: 'Recompense deja reclamee' });
    return;
  }

  // Donner la recompense a la premiere planete
  const planet = db.prepare('SELECT id FROM planets WHERE user_id = ? ORDER BY created_at ASC LIMIT 1').get(userId) as { id: string } | undefined;
  if (planet) {
    db.prepare('UPDATE planets SET metal = metal + ?, crystal = crystal + ?, deuterium = deuterium + ? WHERE id = ?').run(
      def.reward.metal, def.reward.crystal, def.reward.deuterium, planet.id,
    );
  }

  db.prepare('UPDATE achievements SET claimed = 1 WHERE user_id = ? AND achievement_id = ?').run(userId, achievementId);

  res.json({ ok: true, reward: def.reward });
});

// === TUTORIEL ===

// GET /api/achievements/tutorial
router.get('/tutorial', (req: AuthRequest, res) => {
  const db = getDb();
  const userId = req.user!.userId;

  const row = db.prepare('SELECT current_step, completed FROM tutorial_progress WHERE user_id = ?').get(userId) as {
    current_step: number; completed: number;
  } | undefined;

  if (!row) {
    res.json({ currentStep: 0, completed: false });
    return;
  }

  res.json({ currentStep: row.current_step, completed: !!row.completed });
});

// POST /api/achievements/tutorial
router.post('/tutorial', (req: AuthRequest, res) => {
  const db = getDb();
  const userId = req.user!.userId;
  const { currentStep, completed } = req.body as { currentStep: number; completed: boolean };

  db.prepare(`
    INSERT INTO tutorial_progress (user_id, current_step, completed)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET current_step = excluded.current_step, completed = excluded.completed
  `).run(userId, currentStep, completed ? 1 : 0);

  res.json({ ok: true });
});

export default router;
