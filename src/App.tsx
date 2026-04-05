import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Overview } from './components/Overview';
import { Buildings } from './components/Buildings';
import { Research } from './components/Research';
import { Shipyard } from './components/Shipyard';
import { Defenses } from './components/Defenses';
import { Fleet } from './components/Fleet';
import { Galaxy } from './components/Galaxy';
import { Messages } from './components/Messages';
import { Auth } from './components/Auth';
import { Alliance } from './components/Alliance';
import { Rankings } from './components/Rankings';
import { Changelog } from './components/Changelog';
import { useResourceTick } from './hooks/useResourceTick';
import { useAuth } from './hooks/useAuth';
import { useSync } from './hooks/useSync';
import { useGameStore } from './store/gameStore';
import './App.css';

const NAV_ITEMS = [
  { path: '/', label: 'Apercu' },
  { path: '/buildings', label: 'Batiments' },
  { path: '/research', label: 'Recherche' },
  { path: '/shipyard', label: 'Chantier' },
  { path: '/defenses', label: 'Defenses' },
  { path: '/fleet', label: 'Flotte' },
  { path: '/galaxy', label: 'Galaxie' },
  { path: '/messages', label: 'Messages' },
  { path: '/alliance', label: 'Alliance' },
  { path: '/rankings', label: 'Classement' },
  { path: '/changelog', label: 'Changelog' },
];

function PlanetSwitcher() {
  const planets = useGameStore((s) => s.planets);
  const currentPlanetId = useGameStore((s) => s.currentPlanetId);
  const setCurrentPlanet = useGameStore((s) => s.setCurrentPlanet);

  if (planets.length <= 1) return null;

  return (
    <div className="planet-switcher">
      <select
        value={currentPlanetId ?? ''}
        onChange={(e) => setCurrentPlanet(e.target.value)}
      >
        {planets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} [{p.coordinates.galaxy}:{p.coordinates.system}:{p.coordinates.position}]
          </option>
        ))}
      </select>
    </div>
  );
}

function MobileHeader({ username, onLogout }: { username: string; onLogout: () => void }) {
  const planets = useGameStore((s) => s.planets);
  const currentPlanetId = useGameStore((s) => s.currentPlanetId);
  const setCurrentPlanet = useGameStore((s) => s.setCurrentPlanet);

  return (
    <div className="mobile-header">
      <span className="mobile-title">OGame2D</span>
      {planets.length > 1 && (
        <select
          className="mobile-planet-select"
          value={currentPlanetId ?? ''}
          onChange={(e) => setCurrentPlanet(e.target.value)}
        >
          {planets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} [{p.coordinates.galaxy}:{p.coordinates.system}:{p.coordinates.position}]
            </option>
          ))}
        </select>
      )}
      <div className="mobile-user">
        <span className="mobile-username">{username}</span>
        <button className="nav-logout" onClick={onLogout}>X</button>
      </div>
    </div>
  );
}

function GameApp({ username, onLogout }: { username: string; onLogout: () => void }) {
  useResourceTick();
  useSync();

  const unreadMessages = useGameStore((s) => s.messages.filter((m) => !m.read).length);

  return (
    <div className="game-layout">
      <MobileHeader username={username} onLogout={onLogout} />
      <nav className="game-nav">
        <div className="game-title">OGame2D</div>
        <PlanetSwitcher />
        <ul>
          {NAV_ITEMS.map(({ path, label }) => (
            <li key={path}>
              <NavLink to={path} end={path === '/'}>
                {label}
                {path === '/messages' && unreadMessages > 0 && (
                  <span className="nav-badge">{unreadMessages}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="nav-user">
          <span className="nav-username">{username}</span>
          <button className="nav-logout" onClick={onLogout}>Deconnexion</button>
        </div>
      </nav>
      <main className="game-content">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/buildings" element={<Buildings />} />
          <Route path="/research" element={<Research />} />
          <Route path="/shipyard" element={<Shipyard />} />
          <Route path="/defenses" element={<Defenses />} />
          <Route path="/fleet" element={<Fleet />} />
          <Route path="/galaxy" element={<Galaxy />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/alliance" element={<Alliance />} />
          <Route path="/rankings" element={<Rankings />} />
          <Route path="/changelog" element={<Changelog />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const { user, loading, error, login, register, logout } = useAuth();

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">OGame2D</h1>
          <p className="auth-subtitle">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={login} onRegister={register} error={error} loading={loading} />;
  }

  return (
    <BrowserRouter>
      <GameApp username={user.username} onLogout={logout} />
    </BrowserRouter>
  );
}

export default App;
