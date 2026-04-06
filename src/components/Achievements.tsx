import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '../api/client';
import { formatNumber } from '../utils/format';

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'economy' | 'military' | 'research' | 'exploration' | 'social';
  reward: { metal: number; crystal: number; deuterium: number };
  icon: string;
  unlocked: boolean;
  unlockedAt: number | null;
  claimed: boolean;
}

type CategoryFilter = 'all' | Achievement['category'];

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: 'Tous',
  economy: 'Economie',
  military: 'Militaire',
  research: 'Recherche',
  exploration: 'Exploration',
  social: 'Social',
};

export function Achievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<Achievement[]>('/achievements');
      setAchievements(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleClaim = async (id: string) => {
    setClaiming(id);
    try {
      await apiPost(`/achievements/claim/${id}`, {});
      setAchievements((prev) => prev.map((a) => a.id === id ? { ...a, claimed: true } : a));
    } catch { /* ignore */ }
    setClaiming(null);
  };

  const filtered = category === 'all'
    ? achievements
    : achievements.filter((a) => a.category === category);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const claimableCount = achievements.filter((a) => a.unlocked && !a.claimed).length;

  // Trier : non reclames d'abord, puis debloques, puis verrouilles
  const sorted = [...filtered].sort((a, b) => {
    if (a.unlocked && !a.claimed && !(b.unlocked && !b.claimed)) return -1;
    if (b.unlocked && !b.claimed && !(a.unlocked && !a.claimed)) return 1;
    if (a.unlocked && !b.unlocked) return -1;
    if (b.unlocked && !a.unlocked) return 1;
    return 0;
  });

  return (
    <div className="buildings-page">
      <div className="page-header">
        <h2>Succes</h2>
        <span className="slots-info">
          {unlockedCount}/{achievements.length}
          {claimableCount > 0 && ` — ${claimableCount} a reclamer`}
        </span>
      </div>

      {/* Barre de progression globale */}
      <div className="achievement-progress">
        <div className="timer-bar" style={{ height: '8px' }}>
          <div
            className="timer-fill"
            style={{ width: `${achievements.length > 0 ? (unlockedCount / achievements.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="message-filters">
        {(Object.keys(CATEGORY_LABELS) as CategoryFilter[]).map((cat) => (
          <button
            key={cat}
            className={`mission-btn ${category === cat ? 'active' : ''}`}
            onClick={() => setCategory(cat)}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="building-card"><p className="building-desc">Chargement...</p></div>
      ) : (
        <div className="building-grid">
          {sorted.map((a) => (
            <div
              key={a.id}
              className={`building-card ${!a.unlocked ? 'locked' : ''} ${a.unlocked && !a.claimed ? 'building' : ''}`}
            >
              <div className="building-header">
                <span className="achievement-icon">{a.icon}</span>
                <div className="building-title">
                  <h3>{a.name}</h3>
                  <span className="building-level">
                    {a.unlocked
                      ? a.claimed ? 'Reclame' : 'Debloque !'
                      : 'Verrouille'}
                  </span>
                </div>
              </div>

              <p className="building-desc">{a.description}</p>

              <div className="building-cost">
                <span className="achievement-reward-label">Recompense :</span>
                {a.reward.metal > 0 && (
                  <span><img src="/assets/fer.png" alt="" className="cost-icon" /> {formatNumber(a.reward.metal)}</span>
                )}
                {a.reward.crystal > 0 && (
                  <span><img src="/assets/cristal.png" alt="" className="cost-icon" /> {formatNumber(a.reward.crystal)}</span>
                )}
                {a.reward.deuterium > 0 && (
                  <span><img src="/assets/deuterium.png" alt="" className="cost-icon" /> {formatNumber(a.reward.deuterium)}</span>
                )}
              </div>

              {a.unlocked && !a.claimed && (
                <button
                  className="build-btn ready"
                  onClick={() => handleClaim(a.id)}
                  disabled={claiming === a.id}
                >
                  {claiming === a.id ? 'Reclamation...' : 'Reclamer la recompense'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
