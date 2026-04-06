import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '../api/client';
import { formatNumber } from '../utils/format';

interface RankEntry {
  rank: number;
  userId: string;
  username: string;
  homeworld: string | null;
  allianceTag: string | null;
  allianceId: string | null;
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

function PlayerActions({ player, onClose }: { player: RankEntry; onClose: () => void }) {
  const [msgForm, setMsgForm] = useState({ subject: '', body: '' });
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSendMessage = async () => {
    setSending(true);
    setFeedback(null);
    try {
      await apiPost('/social/send', { toUsername: player.username, ...msgForm });
      setFeedback('Message envoye !');
      setMsgForm({ subject: '', body: '' });
    } catch (err) {
      setFeedback((err as Error).message);
    }
    setSending(false);
  };

  const handleInvite = async () => {
    // On envoie un message d'invitation avec le lien de l'alliance
    try {
      await apiPost('/social/send', {
        toUsername: player.username,
        subject: 'Invitation alliance',
        body: `Tu es invite a rejoindre notre alliance ! Rendez-vous dans l'onglet Alliance pour nous rejoindre.`,
      });
      setFeedback('Invitation envoyee par message !');
    } catch (err) {
      setFeedback((err as Error).message);
    }
  };

  return (
    <div className="player-actions">
      <div className="player-actions-header">
        <strong>{player.username}</strong>
        {player.homeworld && (
          <span className="player-coords">[{player.homeworld}]</span>
        )}
        {player.allianceTag && (
          <span className="player-alliance">[{player.allianceTag}]</span>
        )}
        <button className="message-delete" onClick={onClose}>x</button>
      </div>

      {feedback && (
        <div className="report-winner attacker" style={{ marginBottom: '0.5rem', fontSize: '0.8rem' }}>
          {feedback}
        </div>
      )}

      <div className="player-actions-buttons">
        <button
          className="build-btn"
          onClick={handleInvite}
          title="Envoyer une invitation a rejoindre votre alliance"
        >
          Inviter en alliance
        </button>
      </div>

      <div className="player-msg-form">
        <input
          placeholder="Sujet"
          value={msgForm.subject}
          onChange={(e) => setMsgForm((f) => ({ ...f, subject: e.target.value }))}
          maxLength={100}
        />
        <textarea
          placeholder="Message..."
          value={msgForm.body}
          onChange={(e) => setMsgForm((f) => ({ ...f, body: e.target.value }))}
          rows={3}
          maxLength={2000}
        />
        <button
          className="build-btn ready"
          onClick={handleSendMessage}
          disabled={sending || !msgForm.subject || !msgForm.body}
        >
          {sending ? 'Envoi...' : 'Envoyer message'}
        </button>
      </div>
    </div>
  );
}

export function Rankings() {
  const [category, setCategory] = useState<Category>('total');
  const [rankings, setRankings] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<RankEntry | null>(null);

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
                <th>Planete</th>
                <th>Alliance</th>
                <th>{CATEGORY_LABELS[category]}</th>
                {category === 'total' && (
                  <>
                    <th>Eco</th>
                    <th>Rech</th>
                    <th>Mil</th>
                  </>
                )}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r.username} className={selectedPlayer?.username === r.username ? 'selected-row' : ''}>
                  <td className="rank-number">{i + 1}</td>
                  <td>{r.username}</td>
                  <td className="rank-coords">{r.homeworld ? `[${r.homeworld}]` : '-'}</td>
                  <td className="rank-alliance">{r.allianceTag ? `[${r.allianceTag}]` : '-'}</td>
                  <td>{formatNumber(getPoints(r))}</td>
                  {category === 'total' && (
                    <>
                      <td>{formatNumber(r.economyPoints)}</td>
                      <td>{formatNumber(r.researchPoints)}</td>
                      <td>{formatNumber(r.militaryPoints)}</td>
                    </>
                  )}
                  <td>
                    <button
                      className="rank-action-btn"
                      onClick={() => setSelectedPlayer(selectedPlayer?.username === r.username ? null : r)}
                      title="Actions"
                    >
                      ...
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedPlayer && (
        <PlayerActions
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}
