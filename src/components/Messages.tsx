import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import type { GameMessage } from '../store/gameStore';
import { apiGet, apiPost, apiPut, apiDelete } from '../api/client';
import { formatNumber } from '../utils/format';

const TYPE_LABELS: Record<string, string> = {
  combat: 'Combat',
  espionage: 'Espionnage',
  transport: 'Transport',
  colonization: 'Colonisation',
  system: 'Systeme',
};

interface PrivateMessage {
  id: string;
  subject: string;
  body: string;
  from_username?: string;
  to_username?: string;
  read?: boolean;
  timestamp: number;
}

// ---- Sous-composants rapports ----

function CombatReport({ msg }: { msg: GameMessage }) {
  const result = msg.combatResult;
  if (!result) return null;

  const winnerLabel = result.winner === 'attacker' ? 'Attaquant' : result.winner === 'defender' ? 'Defenseur' : 'Match nul';

  return (
    <div className="report-detail">
      <div className={`report-winner ${result.winner}`}>
        Vainqueur : {winnerLabel}
      </div>

      <div className="report-rounds">
        <h4>Rounds ({result.rounds.length})</h4>
        <table className="report-table">
          <thead>
            <tr>
              <th>Round</th>
              <th>Attaquant</th>
              <th>Defenseur</th>
              <th>Pertes Att.</th>
              <th>Pertes Def.</th>
            </tr>
          </thead>
          <tbody>
            {result.rounds.map((r) => (
              <tr key={r.round}>
                <td>{r.round}</td>
                <td>{r.attackerUnits}</td>
                <td>{r.defenderUnits}</td>
                <td className="loss">{r.attackerLosses}</td>
                <td className="loss">{r.defenderLosses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {Object.keys(result.attackerLosses).length > 0 && (
        <div className="report-losses">
          <h4>Pertes attaquant</h4>
          <div className="unit-stats">
            {Object.entries(result.attackerLosses).map(([type, count]) => (
              <span key={type}>{type}: {count}</span>
            ))}
          </div>
        </div>
      )}

      {Object.keys(result.defenderLosses).length > 0 && (
        <div className="report-losses">
          <h4>Pertes defenseur</h4>
          <div className="unit-stats">
            {Object.entries(result.defenderLosses).map(([type, count]) => (
              <span key={type}>{type}: {count}</span>
            ))}
          </div>
        </div>
      )}

      <div className="report-loot">
        <h4>Butin</h4>
        <div className="unit-stats">
          {result.loot.metal > 0 && <span>Fe {formatNumber(result.loot.metal)}</span>}
          {result.loot.crystal > 0 && <span>Cr {formatNumber(result.loot.crystal)}</span>}
          {result.loot.deuterium > 0 && <span>De {formatNumber(result.loot.deuterium)}</span>}
          {result.loot.metal === 0 && result.loot.crystal === 0 && result.loot.deuterium === 0 && (
            <span>Aucun butin</span>
          )}
        </div>
      </div>

      <div className="report-debris">
        <h4>Champ de debris</h4>
        <div className="unit-stats">
          <span>Fe {formatNumber(result.debris.metal)}</span>
          <span>Cr {formatNumber(result.debris.crystal)}</span>
        </div>
        {result.moonChance > 0 && (
          <span className="moon-chance">Chance de lune : {result.moonChance}%</span>
        )}
      </div>
    </div>
  );
}

function EspionageReport({ msg }: { msg: GameMessage }) {
  const report = msg.espionageReport;
  if (!report) return null;

  return (
    <div className="report-detail">
      <div className="report-target">
        <strong>{report.planetName}</strong>
        <span> [{report.coordinates.galaxy}:{report.coordinates.system}:{report.coordinates.position}]</span>
      </div>

      <div className="report-section">
        <h4>Ressources</h4>
        <div className="unit-stats">
          <span>Fe {formatNumber(report.resources.metal)}</span>
          <span>Cr {formatNumber(report.resources.crystal)}</span>
          <span>De {formatNumber(report.resources.deuterium)}</span>
        </div>
      </div>

      {report.ships && Object.keys(report.ships).length > 0 && (
        <div className="report-section">
          <h4>Flotte</h4>
          <div className="unit-stats">
            {Object.entries(report.ships).map(([type, count]) => (
              <span key={type}>{type}: {count}</span>
            ))}
          </div>
        </div>
      )}

      {report.defenses && Object.keys(report.defenses).length > 0 && (
        <div className="report-section">
          <h4>Defenses</h4>
          <div className="unit-stats">
            {Object.entries(report.defenses).map(([type, count]) => (
              <span key={type}>{type}: {count}</span>
            ))}
          </div>
        </div>
      )}

      {!report.ships && (
        <div className="report-section">
          <p className="building-desc">Niveau d'espionnage insuffisant pour voir la flotte.</p>
        </div>
      )}
    </div>
  );
}

// ---- Formulaire d'envoi ----

function ComposeForm() {
  const [form, setForm] = useState({ toUsername: '', subject: '', body: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSend = async () => {
    setError(null);
    setSuccess(null);
    try {
      await apiPost('/social/send', form);
      setSuccess('Message envoye !');
      setForm({ toUsername: '', subject: '', body: '' });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="building-card">
      {error && <div className="auth-error">{error}</div>}
      {success && <div className="report-winner attacker">{success}</div>}
      <div className="auth-form">
        <div className="auth-field">
          <label>Destinataire</label>
          <input
            value={form.toUsername}
            onChange={(e) => setForm((f) => ({ ...f, toUsername: e.target.value }))}
            placeholder="Nom du joueur"
          />
        </div>
        <div className="auth-field">
          <label>Sujet</label>
          <input
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            placeholder="Sujet du message"
            maxLength={100}
          />
        </div>
        <div className="auth-field">
          <label>Message</label>
          <textarea
            className="social-textarea"
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            placeholder="Votre message..."
            rows={5}
            maxLength={2000}
          />
        </div>
        <button
          className="build-btn ready"
          onClick={handleSend}
          disabled={!form.toUsername || !form.subject || !form.body}
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}

// ---- Composant principal ----

type TabFilter = 'all' | 'combat' | 'espionage' | 'transport' | 'system' | 'inbox' | 'sent' | 'write';

export function Messages() {
  const systemMessages = useGameStore((s) => s.messages);
  const markMessageRead = useGameStore((s) => s.markMessageRead);
  const deleteMessage = useGameStore((s) => s.deleteMessage);

  const [tab, setTab] = useState<TabFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [inbox, setInbox] = useState<PrivateMessage[]>([]);
  const [sent, setSent] = useState<PrivateMessage[]>([]);

  const loadInbox = useCallback(async () => {
    try {
      const data = await apiGet<PrivateMessage[]>('/social/inbox');
      setInbox(data);
    } catch { /* ignore */ }
  }, []);

  const loadSent = useCallback(async () => {
    try {
      const data = await apiGet<PrivateMessage[]>('/social/sent');
      setSent(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadInbox(); }, [loadInbox]);

  const handlePrivateRead = async (id: string) => {
    await apiPut(`/social/read/${id}`, {});
    setInbox((msgs) => msgs.map((m) => m.id === id ? { ...m, read: true } : m));
  };

  const handlePrivateDelete = async (id: string) => {
    await apiDelete(`/social/${id}`);
    setInbox((msgs) => msgs.filter((m) => m.id !== id));
    setSent((msgs) => msgs.filter((m) => m.id !== id));
  };

  // Compteur total non lus
  const systemUnread = systemMessages.filter((m) => !m.read).length;
  const privateUnread = inbox.filter((m) => !m.read).length;
  const totalUnread = systemUnread + privateUnread;

  // Messages systeme filtres
  const isSystemTab = ['all', 'combat', 'espionage', 'transport', 'system'].includes(tab);

  const toggleExpandSystem = (msg: GameMessage) => {
    if (expandedId === msg.id) {
      setExpandedId(null);
    } else {
      setExpandedId(msg.id);
      if (!msg.read) markMessageRead(msg.id);
    }
  };

  const toggleExpandPrivate = (msg: PrivateMessage) => {
    if (expandedId === msg.id) {
      setExpandedId(null);
    } else {
      setExpandedId(msg.id);
      if (!msg.read) handlePrivateRead(msg.id);
    }
  };

  const filteredSystem = tab === 'all'
    ? systemMessages
    : systemMessages.filter((m) => m.type === tab);
  const sortedSystem = [...filteredSystem].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="buildings-page">
      <div className="page-header">
        <h2>Messages</h2>
        {totalUnread > 0 && (
          <span className="slots-info">{totalUnread} non lu{totalUnread > 1 ? 's' : ''}</span>
        )}
      </div>

      <div className="message-filters">
        <button className={`mission-btn ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
          Tous
        </button>
        <button className={`mission-btn ${tab === 'combat' ? 'active' : ''}`} onClick={() => setTab('combat')}>
          Combat
        </button>
        <button className={`mission-btn ${tab === 'espionage' ? 'active' : ''}`} onClick={() => setTab('espionage')}>
          Espionnage
        </button>
        <button className={`mission-btn ${tab === 'transport' ? 'active' : ''}`} onClick={() => setTab('transport')}>
          Transport
        </button>
        <button className={`mission-btn ${tab === 'system' ? 'active' : ''}`} onClick={() => setTab('system')}>
          Systeme
        </button>
        <span className="message-filter-separator">|</span>
        <button className={`mission-btn ${tab === 'inbox' ? 'active' : ''}`} onClick={() => { setTab('inbox'); loadInbox(); }}>
          Recus{privateUnread > 0 && <span className="msg-badge">{privateUnread}</span>}
        </button>
        <button className={`mission-btn ${tab === 'sent' ? 'active' : ''}`} onClick={() => { setTab('sent'); loadSent(); }}>
          Envoyes
        </button>
        <button className={`mission-btn ${tab === 'write' ? 'active' : ''}`} onClick={() => setTab('write')}>
          Ecrire
        </button>
      </div>

      {/* Messages systeme (Tous, Combat, Espionnage, Transport, Systeme) */}
      {isSystemTab && (
        <>
          {sortedSystem.length === 0 ? (
            <div className="building-card">
              <p className="building-desc">Aucun message.</p>
            </div>
          ) : (
            <div className="message-list">
              {sortedSystem.map((msg) => {
                const isExpanded = expandedId === msg.id;
                const date = new Date(msg.timestamp);
                const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

                return (
                  <div
                    key={msg.id}
                    className={`message-item ${msg.read ? '' : 'unread'} ${isExpanded ? 'expanded' : ''}`}
                  >
                    <div className="message-header" onClick={() => toggleExpandSystem(msg)}>
                      <span className={`message-type ${msg.type}`}>
                        {TYPE_LABELS[msg.type] || msg.type}
                      </span>
                      <span className="message-title">{msg.title}</span>
                      <span className="message-time">{timeStr}</span>
                      <button
                        className="message-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMessage(msg.id);
                        }}
                      >
                        x
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="message-body">
                        {msg.type === 'combat' && <CombatReport msg={msg} />}
                        {msg.type === 'espionage' && <EspionageReport msg={msg} />}
                        {msg.body && <p>{msg.body}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Courrier recu */}
      {tab === 'inbox' && (
        <div className="message-list">
          {inbox.length === 0 ? (
            <div className="building-card"><p className="building-desc">Aucun message recu.</p></div>
          ) : inbox.map((msg) => (
            <div key={msg.id} className={`message-item ${msg.read ? '' : 'unread'} ${expandedId === msg.id ? 'expanded' : ''}`}>
              <div className="message-header" onClick={() => toggleExpandPrivate(msg)}>
                <span className="message-type espionage">De</span>
                <span className="message-title">{msg.from_username} — {msg.subject}</span>
                <span className="message-time">{new Date(msg.timestamp).toLocaleDateString('fr-FR')}</span>
                <button className="message-delete" onClick={(e) => { e.stopPropagation(); handlePrivateDelete(msg.id); }}>x</button>
              </div>
              {expandedId === msg.id && (
                <div className="message-body">
                  <p>{msg.body}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Courrier envoye */}
      {tab === 'sent' && (
        <div className="message-list">
          {sent.length === 0 ? (
            <div className="building-card"><p className="building-desc">Aucun message envoye.</p></div>
          ) : sent.map((msg) => (
            <div key={msg.id} className={`message-item ${expandedId === msg.id ? 'expanded' : ''}`}>
              <div className="message-header" onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}>
                <span className="message-type transport">A</span>
                <span className="message-title">{msg.to_username} — {msg.subject}</span>
                <span className="message-time">{new Date(msg.timestamp).toLocaleDateString('fr-FR')}</span>
              </div>
              {expandedId === msg.id && (
                <div className="message-body">
                  <p>{msg.body}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Ecrire un message */}
      {tab === 'write' && <ComposeForm />}
    </div>
  );
}
