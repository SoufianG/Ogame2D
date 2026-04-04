import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { GameMessage } from '../store/gameStore';
import { formatNumber } from '../utils/format';

const TYPE_LABELS: Record<string, string> = {
  combat: 'Combat',
  espionage: 'Espionnage',
  transport: 'Transport',
  colonization: 'Colonisation',
  system: 'Systeme',
};

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

export function Messages() {
  const messages = useGameStore((s) => s.messages);
  const markMessageRead = useGameStore((s) => s.markMessageRead);
  const deleteMessage = useGameStore((s) => s.deleteMessage);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all'
    ? messages
    : messages.filter((m) => m.type === filter);

  const sorted = [...filtered].sort((a, b) => b.timestamp - a.timestamp);
  const unreadCount = messages.filter((m) => !m.read).length;

  const toggleExpand = (msg: GameMessage) => {
    if (expandedId === msg.id) {
      setExpandedId(null);
    } else {
      setExpandedId(msg.id);
      if (!msg.read) markMessageRead(msg.id);
    }
  };

  return (
    <div className="buildings-page">
      <div className="page-header">
        <h2>Messages</h2>
        {unreadCount > 0 && (
          <span className="slots-info">{unreadCount} non lu{unreadCount > 1 ? 's' : ''}</span>
        )}
      </div>

      <div className="message-filters">
        {['all', 'combat', 'espionage', 'transport', 'system'].map((f) => (
          <button
            key={f}
            className={`mission-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Tous' : TYPE_LABELS[f] || f}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="building-card">
          <p className="building-desc">Aucun message.</p>
        </div>
      ) : (
        <div className="message-list">
          {sorted.map((msg) => {
            const isExpanded = expandedId === msg.id;
            const date = new Date(msg.timestamp);
            const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

            return (
              <div
                key={msg.id}
                className={`message-item ${msg.read ? '' : 'unread'} ${isExpanded ? 'expanded' : ''}`}
              >
                <div className="message-header" onClick={() => toggleExpand(msg)}>
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
    </div>
  );
}
