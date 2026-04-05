import { useEffect, useRef } from 'react';
import { refreshGameState } from '../api/sync';
import { getToken } from '../api/client';

export function useSync() {
  const loaded = useRef(false);

  // Charger l'etat au mount depuis le serveur
  useEffect(() => {
    if (!getToken() || loaded.current) return;
    loaded.current = true;
    refreshGameState();
  }, []);
}
