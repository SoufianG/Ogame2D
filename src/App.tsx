import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Overview } from './components/Overview';
import { Buildings } from './components/Buildings';
import { Research } from './components/Research';
import { Shipyard } from './components/Shipyard';
import { Defenses } from './components/Defenses';
import { Fleet } from './components/Fleet';
import { Galaxy } from './components/Galaxy';
import { Messages } from './components/Messages';
import { useResourceTick } from './hooks/useResourceTick';
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

function App() {
  useResourceTick();

  return (
    <BrowserRouter>
      <div className="game-layout">
        <nav className="game-nav">
          <div className="game-title">OGame2D</div>
          <PlanetSwitcher />
          <ul>
            {NAV_ITEMS.map(({ path, label }) => (
              <li key={path}>
                <NavLink to={path} end={path === '/'}>
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
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
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
