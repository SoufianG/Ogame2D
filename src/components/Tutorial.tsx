import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../api/client';
import { useGameStore } from '../store/gameStore';

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  hint: string;
  check: () => boolean;
  navigateTo?: string;
}

function useTutorialSteps(): TutorialStep[] {
  const planet = useGameStore((s) => s.currentPlanet)();
  const research = useGameStore((s) => s.research);
  const fleetMovements = useGameStore((s) => s.fleetMovements);

  if (!planet) return [];

  return [
    {
      id: 0,
      title: 'Bienvenue, Commandant !',
      description: 'Vous venez de prendre le commandement de votre premiere planete. Votre mission : batir un empire galactique !',
      hint: 'Cliquez sur "Suivant" pour commencer le tutoriel.',
      check: () => true,
    },
    {
      id: 1,
      title: 'Construire une Mine de Metal',
      description: 'Le metal est la ressource de base. Allez dans Batiments et construisez une Mine de Metal niveau 1.',
      hint: 'Menu Batiments > Mine de Metal > Construire',
      check: () => (planet.buildings.metalMine || 0) >= 1,
      navigateTo: '/buildings',
    },
    {
      id: 2,
      title: 'Construire une Mine de Cristal',
      description: 'Le cristal est essentiel pour les technologies avancees. Construisez une Mine de Cristal.',
      hint: 'Menu Batiments > Mine de Cristal > Construire',
      check: () => (planet.buildings.crystalMine || 0) >= 1,
      navigateTo: '/buildings',
    },
    {
      id: 3,
      title: 'Centrale Solaire',
      description: 'Vos mines consomment de l\'energie ! Construisez une Centrale Solaire pour alimenter vos batiments.',
      hint: 'Menu Batiments > Centrale Solaire > Construire',
      check: () => (planet.buildings.solarPlant || 0) >= 1,
      navigateTo: '/buildings',
    },
    {
      id: 4,
      title: 'Laboratoire de Recherche',
      description: 'Pour debloquer de nouvelles technologies, vous avez besoin d\'un laboratoire.',
      hint: 'Menu Batiments > Laboratoire de Recherche > Construire',
      check: () => (planet.buildings.researchLab || 0) >= 1,
      navigateTo: '/buildings',
    },
    {
      id: 5,
      title: 'Premiere Recherche',
      description: 'Lancez votre premiere recherche ! La Technologie Energetique est un bon point de depart.',
      hint: 'Menu Recherche > Technologie Energetique > Rechercher',
      check: () => Object.values(research).some((v) => v > 0),
      navigateTo: '/research',
    },
    {
      id: 6,
      title: 'Chantier Naval',
      description: 'Construisez un Chantier Naval pour pouvoir produire des vaisseaux et des defenses.',
      hint: 'Menu Batiments > Chantier Naval > Construire',
      check: () => (planet.buildings.shipyard || 0) >= 1,
      navigateTo: '/buildings',
    },
    {
      id: 7,
      title: 'Premier Vaisseau',
      description: 'Construisez votre premier vaisseau ! Un Chasseur Leger est un bon debut.',
      hint: 'Menu Chantier > Chasseur Leger > Construire 1',
      check: () => Object.values(planet.ships || {}).some((v) => v! > 0),
      navigateTo: '/shipyard',
    },
    {
      id: 8,
      title: 'Explorer la Galaxie',
      description: 'Allez voir qui sont vos voisins dans la vue Galaxie !',
      hint: 'Menu Galaxie',
      check: () => true,
      navigateTo: '/galaxy',
    },
    {
      id: 9,
      title: 'Envoyer une Flotte',
      description: 'Vous etes pret pour votre premiere mission ! Envoyez une flotte (meme en espionnage).',
      hint: 'Menu Flotte > Selectionner vaisseaux > Choisir destination > Envoyer',
      check: () => fleetMovements.length > 0,
      navigateTo: '/fleet',
    },
    {
      id: 10,
      title: 'Tutoriel Termine !',
      description: 'Felicitations ! Vous maitrisez les bases. N\'oubliez pas de consulter vos Succes pour des recompenses, et l\'Arbre Technologique pour planifier vos recherches.',
      hint: 'Bonne chance, Commandant !',
      check: () => true,
    },
  ];
}

export function Tutorial() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [loading, setLoading] = useState(true);
  const steps = useTutorialSteps();

  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet<{ currentStep: number; completed: boolean }>('/achievements/tutorial');
        setCurrentStep(data.currentStep);
        setCompleted(data.completed);
      } catch { /* nouveau joueur */ }
      setLoading(false);
    })();
  }, []);

  const saveProgress = async (step: number, done: boolean) => {
    try {
      await apiPost('/achievements/tutorial', { currentStep: step, completed: done });
    } catch { /* ignore */ }
  };

  const step = steps[currentStep];
  const canAdvance = step?.check() ?? false;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      saveProgress(next, false);
    } else {
      setCompleted(true);
      saveProgress(currentStep, true);
    }
  };

  const handleSkip = () => {
    setCompleted(true);
    saveProgress(steps.length - 1, true);
  };

  if (loading || !step || completed) return null;

  // Mode reduit : juste une petite barre cliquable
  if (minimized) {
    return (
      <div className="tutorial-minimized" onClick={() => setMinimized(false)}>
        <span className="tutorial-minimized-step">{currentStep + 1}/{steps.length}</span>
        <span className="tutorial-minimized-title">{step.title}</span>
        {canAdvance && <span className="tutorial-minimized-ready">!</span>}
      </div>
    );
  }

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-card">
        <div className="tutorial-header">
          <span className="tutorial-step">Etape {currentStep + 1}/{steps.length}</span>
          <div className="tutorial-header-actions">
            <button className="tutorial-minimize" onClick={() => setMinimized(true)} title="Reduire">_</button>
            <button className="tutorial-skip" onClick={handleSkip}>Passer</button>
          </div>
        </div>

        <h3 className="tutorial-title">{step.title}</h3>
        <p className="tutorial-desc">{step.description}</p>

        <div className="tutorial-hint">
          <span>{step.hint}</span>
        </div>

        {step.navigateTo && !canAdvance && (
          <a href={step.navigateTo} className="build-btn" style={{ textDecoration: 'none', textAlign: 'center', display: 'block', marginBottom: '0.5rem' }}>
            Aller a la page
          </a>
        )}

        <div className="tutorial-progress">
          <div className="timer-bar" style={{ height: '4px' }}>
            <div className="timer-fill" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} />
          </div>
        </div>

        <button
          className={`build-btn ${canAdvance ? 'ready' : 'disabled'}`}
          onClick={handleNext}
          disabled={!canAdvance}
        >
          {currentStep === steps.length - 1 ? 'Terminer' : canAdvance ? 'Suivant' : 'Completez l\'objectif'}
        </button>
      </div>
    </div>
  );
}

export function TutorialButton() {
  const [completed, setCompleted] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet<{ completed: boolean }>('/achievements/tutorial');
        setCompleted(data.completed);
      } catch { /* ignore */ }
    })();
  }, []);

  if (!completed) return null;

  const handleReopen = async () => {
    try {
      await apiPost('/achievements/tutorial', { currentStep: 0, completed: false });
      window.location.reload();
    } catch { /* ignore */ }
  };

  return (
    <button className="tutorial-reopen" onClick={handleReopen} title="Relancer le tutoriel">
      ?
    </button>
  );
}
