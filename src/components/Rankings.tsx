import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../api/client';
import { formatNumber } from '../utils/format';

interface RankEntry {
  rank: number;
  username: string;
  totalPoints: number;
  total_points?: number;
  economyPoints: number;
  economy_points?: number;
  researchPoints: number;
  research_points?: number;
  militaryPoints: number;
  military_points?: number;
}

type Category = 'total' | 'economy' | 'research' | 'military';

const CATEGORY_LABELS: Record<Category, string> = {
  total: 'General',
  economy: 'Economie',
  research: 'Recherche',
  military: 'Militaire',
};

export function Rankings() {
  const [category, setCategory] = useState<Category>('total');
  const [rankings, setRankings] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<RankEntry[]>('/rankings');
      // Normaliser les noms de champs (snake_case du backend -> camelCase)
      setRankings(data.map((r) => ({
        ...r,
        totalPoints: r.totalPoints || r.total_points || 0,
        economyPoints: r.economyPoints || r.economy_points || 0,
        researchPoints: r.researchPoints || r.research_points || 0,
        militaryPoints: r.militaryPoints || r.military_points || 0,
      })));
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const sorted = [...rankings].sort((a, b) => {
    switch (category) {
      case 'economy': return b.economyPoints - a.economyPoints;
      case 'research': return b.researchPoints - a.researchPoints;
      case 'military': return b.militaryPoints - a.militaryPoints;
      default: return b.totalPoints - a.totalPoints;
    }
  });

  const getPoints = (r: RankEntry) => {
    switch (category) {
      case 'economy': return r.economyPoints;
      case 'research': return r.researchPoints;
      case 'military': return r.militaryPoints;
      default: return r.totalPoints;
    }
  };

  return (
    <div className="buildings-page">
      <div className="page-header">
        <h2>Classement</h2>
      </div>

      <div className="message-filters">
        {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
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
      ) : sorted.length === 0 ? (
        <div className="building-card"><p className="building-desc">Aucun joueur classe.</p></div>
      ) : (
        <div className="ranking-table">
          <table className="report-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Joueur</th>
                <th>{CATEGORY_LABELS[category]}</th>
                {category === 'total' && (
                  <>
                    <th>Eco</th>
                    <th>Rech</th>
                    <th>Mil</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r.username}>
                  <td className="rank-number">{i + 1}</td>
                  <td>{r.username}</td>
                  <td>{formatNumber(getPoints(r))}</td>
                  {category === 'total' && (
                    <>
                      <td>{formatNumber(r.economyPoints)}</td>
                      <td>{formatNumber(r.researchPoints)}</td>
                      <td>{formatNumber(r.militaryPoints)}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
