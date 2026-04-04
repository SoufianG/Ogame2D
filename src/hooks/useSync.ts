import { useEffect, useRef } from 'react';
import { loadGameState, saveAll } from '../api/sync';
import { getToken } from '../api/client';

const SAVE_INTERVAL = 30_000; // 30 secondes

export function useSync() {
  const loaded = useRef(false);

  // Charger l'etat au mount
  useEffect(() => {
    if (!getToken() || loaded.current) return;
    loaded.current = true;
    loadGameState();
  }, []);

  // Sauvegarder periodiquement
  useEffect(() => {
    if (!getToken()) return;

    const interval = setInterval(saveAll, SAVE_INTERVAL);

    // Sauvegarder aussi quand l'utilisateur quitte la page
    const handleBeforeUnload = () => { saveAll(); };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
}
