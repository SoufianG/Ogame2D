import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../api/client';

interface PrivateMessage {
  id: string;
  subject: string;
  body: string;
  from_username?: string;
  to_username?: string;
  read?: boolean;
  is_read?: number;
  timestamp: number;
}

export function Social() {
  const [tab, setTab] = useState<'inbox' | 'sent' | 'write'>('inbox');
  const [inbox, setInbox] = useState<PrivateMessage[]>([]);
  const [sent, setSent] = useState<PrivateMessage[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ toUsername: '', subject: '', body: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const handleSend = async () => {
    setError(null);
    setSuccess(null);
    try {
      await apiPost('/social/send', form);
      setSuccess('Message envoye !');
      setForm({ toUsername: '', subject: '', body: '' });
      loadSent();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleRead = async (id: string) => {
    await apiPut(`/social/read/${id}`, {});
    setInbox((msgs) => msgs.map((m) => m.id === id ? { ...m, read: true } : m));
  };

  const handleDelete = async (id: string) => {
    await apiDelete(`/social/${id}`);
    setInbox((msgs) => msgs.filter((m) => m.id !== id));
    setSent((msgs) => msgs.filter((m) => m.id !== id));
  };

  const toggleExpand = (msg: PrivateMessage) => {
    if (expanded === msg.id) {
      setExpanded(null);
    } else {
      setExpanded(msg.id);
      if (!msg.read) handleRead(msg.id);
    }
  };

  const unreadCount = inbox.filter((m) => !m.read).length;

  return (
    <div className="buildings-page">
      <div className="page-header">
        <h2>Messagerie</h2>
        {unreadCount > 0 && <span className="slots-info">{unreadCount} non lu{unreadCount > 1 ? 's' : ''}</span>}
      </div>

      <div className="message-filters">
        <button className={`mission-btn ${tab === 'inbox' ? 'active' : ''}`} onClick={() => { setTab('inbox'); loadInbox(); }}>
          Recus
        </button>
        <button className={`mission-btn ${tab === 'sent' ? 'active' : ''}`} onClick={() => { setTab('sent'); loadSent(); }}>
          Envoyes
        </button>
        <button className={`mission-btn ${tab === 'write' ? 'active' : ''}`} onClick={() => setTab('write')}>
          Ecrire
        </button>
      </div>

      {/* Inbox */}
      {tab === 'inbox' && (
        <div className="message-list">
          {inbox.length === 0 ? (
            <div className="building-card"><p className="building-desc">Aucun message.</p></div>
          ) : inbox.map((msg) => (
            <div key={msg.id} className={`message-item ${msg.read ? '' : 'unread'} ${expanded === msg.id ? 'expanded' : ''}`}>
              <div className="message-header" onClick={() => toggleExpand(msg)}>
                <span className="message-type espionage">De</span>
                <span className="message-title">{msg.from_username} — {msg.subject}</span>
                <span className="message-time">{new Date(msg.timestamp).toLocaleDateString('fr-FR')}</span>
                <button className="message-delete" onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }}>x</button>
              </div>
              {expanded === msg.id && (
                <div className="message-body">
                  <p>{msg.body}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sent */}
      {tab === 'sent' && (
        <div className="message-list">
          {sent.length === 0 ? (
            <div className="building-card"><p className="building-desc">Aucun message envoye.</p></div>
          ) : sent.map((msg) => (
            <div key={msg.id} className={`message-item ${expanded === msg.id ? 'expanded' : ''}`}>
              <div className="message-header" onClick={() => setExpanded(expanded === msg.id ? null : msg.id)}>
                <span className="message-type transport">A</span>
                <span className="message-title">{msg.to_username} — {msg.subject}</span>
                <span className="message-time">{new Date(msg.timestamp).toLocaleDateString('fr-FR')}</span>
              </div>
              {expanded === msg.id && (
                <div className="message-body">
                  <p>{msg.body}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Write */}
      {tab === 'write' && (
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
      )}
    </div>
  );
}
