import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { computeProduction, computeStorage } from '../utils/production';

const TICK_INTERVAL = 1000; // 1 seconde

export function useResourceTick() {
  const lastTick = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastTick.current) / 1000;
      lastTick.current = now;

      const state = useGameStore.getState();

      for (const planet of state.planets) {
        const production = computeProduction(planet);
        const hoursElapsed = elapsed / 3600;

        // Stockage dynamique selon niveau des hangars
        const metalCap = computeStorage(planet.buildings.metalStorage);
        const crystalCap = computeStorage(planet.buildings.crystalStorage);
        const deutCap = computeStorage(planet.buildings.deuteriumTank);

        const newMetal = Math.min(
          metalCap,
          planet.resources.metal + production.metalPerHour * hoursElapsed
        );
        const newCrystal = Math.min(
          crystalCap,
          planet.resources.crystal + production.crystalPerHour * hoursElapsed
        );
        const newDeuterium = Math.min(
          deutCap,
          planet.resources.deuterium + production.deuteriumPerHour * hoursElapsed
        );

        state.updateResources(planet.id, {
          metal: newMetal,
          crystal: newCrystal,
          deuterium: newDeuterium,
        });
      }

      // Avancer les timers de construction
      state.tickConstructions();
    }, TICK_INTERVAL);

    return () => clearInterval(interval);
  }, []);
}
