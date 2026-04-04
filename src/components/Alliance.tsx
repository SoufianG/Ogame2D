import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut } from '../api/client';

interface AllianceMember {
  user_id: string;
  username: string;
  rank: string;
  joined_at: number;
}

interface DiplomacyEntry {
  relation: string;
  tag: string;
  name: string;
  target_alliance_id: string;
}

interface AllianceData {
  id: string;
  tag: string;
  name: string;
  description: string;
  myRank: string;
  members: AllianceMember[];
  diplomacy: DiplomacyEntry[];
}

interface AllianceListItem {
  id: string;
  tag: string;
  name: string;
  description: string;
  member_count: number;
  leader_name: string;
}

const RANK_LABELS: Record<string, string> = {
  leader: 'Leader',
  officer: 'Officier',
  member: 'Membre',
};

const RELATION_LABELS: Record<string, string> = {
  war: 'Guerre',
  peace: 'Paix',
  nap: 'Pacte de non-agression',
};

export function Alliance() {
  const [alliance, setAlliance] = useState<AllianceData | null>(null);
  const [alliances, setAlliances] = useState<AllianceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'my' | 'list' | 'create'>('my');
  const [createForm, setCreateForm] = useState({ tag: '', name: '', description: '' });
  const [error, setError] = useState<string | null>(null);

  const loadAlliance = useCallback(async () => {
    try {
      const data = await apiGet<AllianceData | null>('/alliance');
      setAlliance(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const loadList = useCallback(async () => {
    try {
      const data = await apiGet<AllianceListItem[]>('/alliance/list');
      setAlliances(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadAlliance(); }, [loadAlliance]);

  const handleCreate = async () => {
    setError(null);
    try {
      await apiPost('/alliance', createForm);
      await loadAlliance();
      setView('my');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleJoin = async (id: string) => {
    try {
      await apiPost(`/alliance/join/${id}`, {});
      await loadAlliance();
      setView('my');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleLeave = async () => {
    try {
      await apiPost('/alliance/leave', {});
      setAlliance(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleRank = async (userId: string, newRank: string) => {
    try {
      await apiPut('/alliance/rank', { targetUserId: userId, newRank });
      await loadAlliance();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading) return <div className="buildings-page"><p>Chargement...</p></div>;

  return (
    <div className="buildings-page">
      <div className="page-header">
        <h2>Alliance</h2>
        {!alliance && (
          <div className="message-filters">
            <button className={`mission-btn ${view === 'list' ? 'active' : ''}`} onClick={() => { setView('list'); loadList(); }}>
              Alliances
            </button>
            <button className={`mission-btn ${view === 'create' ? 'active' : ''}`} onClick={() => setView('create')}>
              Creer
            </button>
          </div>
        )}
      </div>

      {error && <div className="auth-error">{error}</div>}

      {/* Mon alliance */}
      {alliance && (
        <>
          <div className="building-card">
            <div className="building-header">
              <div className="building-title">
                <h3>[{alliance.tag}] {alliance.name}</h3>
                <span className="building-level">{RANK_LABELS[alliance.myRank]}</span>
              </div>
            </div>
            {alliance.description && <p className="building-desc">{alliance.description}</p>}
          </div>

          <div className="building-category">
            <h3 className="category-title">Membres ({alliance.members.length})</h3>
            <div className="message-list">
              {alliance.members.map((m) => (
                <div key={m.user_id} className="message-item">
                  <div className="message-header">
                    <span className={`message-type ${m.rank === 'leader' ? 'combat' : m.rank === 'officer' ? 'espionage' : 'transport'}`}>
                      {RANK_LABELS[m.rank]}
                    </span>
                    <span className="message-title">{m.username}</span>
                    {alliance.myRank === 'leader' && m.rank !== 'leader' && (
                      <button
                        className="mission-btn"
                        onClick={() => handleRank(m.user_id, m.rank === 'officer' ? 'member' : 'officer')}
                      >
                        {m.rank === 'officer' ? 'Retrograder' : 'Promouvoir'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {alliance.diplomacy.length > 0 && (
            <div className="building-category">
              <h3 className="category-title">Diplomatie</h3>
              <div className="unit-stats">
                {alliance.diplomacy.map((d) => (
                  <span key={d.target_alliance_id}>
                    [{d.tag}] {d.name} — {RELATION_LABELS[d.relation]}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="fleet-actions">
            <button className="build-btn cancel" onClick={handleLeave}>
              Quitter l'alliance
            </button>
          </div>
        </>
      )}

      {/* Liste des alliances */}
      {!alliance && view === 'list' && (
        <div className="building-category">
          <h3 className="category-title">Alliances existantes</h3>
          {alliances.length === 0 ? (
            <div className="building-card">
              <p className="building-desc">Aucune alliance pour le moment.</p>
            </div>
          ) : (
            <div className="message-list">
              {alliances.map((a) => (
                <div key={a.id} className="message-item">
                  <div className="message-header">
                    <span className="message-type espionage">[{a.tag}]</span>
                    <span className="message-title">{a.name}</span>
                    <span className="message-time">{a.member_count} membre{a.member_count > 1 ? 's' : ''}</span>
                    <button className="mission-btn active" onClick={() => handleJoin(a.id)}>Rejoindre</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Creer une alliance */}
      {!alliance && view === 'create' && (
        <div className="building-card">
          <div className="auth-form">
            <div className="auth-field">
              <label>Tag (2-8 caracteres)</label>
              <input value={createForm.tag} onChange={(e) => setCreateForm((f) => ({ ...f, tag: e.target.value }))} maxLength={8} />
            </div>
            <div className="auth-field">
              <label>Nom</label>
              <input value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} maxLength={30} />
            </div>
            <div className="auth-field">
              <label>Description</label>
              <input value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} maxLength={500} />
            </div>
            <button className="build-btn ready" onClick={handleCreate}>
              Fonder l'alliance
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
