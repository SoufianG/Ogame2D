import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { computeProduction, computeStorage } from '../utils/production';
import { refreshGameState } from '../api/sync';
import { getToken } from '../api/client';

const TICK_INTERVAL = 1000; // interpolation locale chaque seconde
const POLL_INTERVAL = 5000; // sync serveur toutes les 5s

export function useResourceTick() {
  const lastTick = useRef(Date.now());
  const lastPoll = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastTick.current) / 1000;
      lastTick.current = now;

      const state = useGameStore.getState();

      // Interpolation locale des ressources
      for (const planet of state.planets) {
        const production = computeProduction(planet);
        const hoursElapsed = elapsed / 3600;

        const metalCap = computeStorage(planet.buildings.metalStorage);
        const crystalCap = computeStorage(planet.buildings.crystalStorage);
        const deutCap = computeStorage(planet.buildings.deuteriumTank);

        const newMetal = Math.min(
          metalCap,
          planet.resources.metal + production.metalPerHour * hoursElapsed,
        );
        const newCrystal = Math.min(
          crystalCap,
          planet.resources.crystal + production.crystalPerHour * hoursElapsed,
        );
        const newDeuterium = Math.min(
          deutCap,
          planet.resources.deuterium + production.deuteriumPerHour * hoursElapsed,
        );

        state.updateResources(planet.id, {
          metal: newMetal,
          crystal: newCrystal,
          deuterium: newDeuterium,
        });
      }

      // Decrementer les timers localement
      state.tickTimers();

      // Poll serveur toutes les 5s
      if (now - lastPoll.current >= POLL_INTERVAL && getToken()) {
        lastPoll.current = now;
        refreshGameState();
      }
    }, TICK_INTERVAL);

    return () => clearInterval(interval);
  }, []);
}
