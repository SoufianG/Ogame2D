import { useState } from 'react';

interface Props {
  onLogin: (username: string, password: string) => Promise<boolean>;
  onRegister: (username: string, email: string, password: string) => Promise<boolean>;
  error: string | null;
  loading: boolean;
}

export function Auth({ onLogin, onRegister, error, loading }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      await onLogin(username, password);
    } else {
      await onRegister(username, email, password);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">OGame2D</h1>
        <p className="auth-subtitle">
          {mode === 'login' ? 'Connexion' : 'Inscription'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="username">Nom d'utilisateur</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Commandant..."
              required
              minLength={3}
              maxLength={20}
              autoComplete="username"
            />
          </div>

          {mode === 'register' && (
            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemple.com"
                required
                autoComplete="email"
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'Se connecter' : 'Creer un compte'}
          </button>
        </form>

        <button
          className="auth-switch"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login'
            ? 'Pas encore de compte ? Inscription'
            : 'Deja un compte ? Connexion'}
        </button>
      </div>
    </div>
  );
}
