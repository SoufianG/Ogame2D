import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { useToastStore } from '../store/toastStore';
import { computeProduction, computeStorage } from '../utils/production';
import { refreshGameState, apiLoadMessages } from '../api/sync';
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

        // Snapshot avant refresh pour detecter les changements
        const before = useGameStore.getState();
        const prevQueues = { ...before.buildingQueues };
        const prevResearch = before.researchQueue;
        const prevFleets = before.fleetMovements.length;

        refreshGameState().then(() => {
          const after = useGameStore.getState();
          const addToast = useToastStore.getState().addToast;

          // Construction terminee
          for (const [planetId, queue] of Object.entries(prevQueues)) {
            if (queue && queue.remainingTime <= 5 && !after.buildingQueues[planetId]) {
              const planet = after.planets.find((p) => p.id === planetId);
              addToast('building', 'Construction terminee', `${queue.building} niv. ${queue.targetLevel} sur ${planet?.name || 'planete'}`);
            }
          }

          // Recherche terminee
          if (prevResearch && prevResearch.remainingTime <= 5 && !after.researchQueue) {
            addToast('research', 'Recherche terminee', `${prevResearch.research} niv. ${prevResearch.targetLevel}`);
          }

          // Flotte arrivee (nombre de flottes diminue)
          if (after.fleetMovements.length < prevFleets) {
            addToast('fleet', 'Flotte arrivee', `Une de vos flottes a atteint sa destination`);
          }
        });

        // Charger les messages serveur
        apiLoadMessages().then((msgs) => {
          if (msgs.length > 0) {
            const before = useGameStore.getState();
            const addToast = useToastStore.getState().addToast;

            // Detecter les nouveaux messages
            const prevIds = new Set(before.messages.map((m) => m.id));
            const newMsgs = msgs.filter((m) => !prevIds.has(m.id) && !m.read);

            for (const msg of newMsgs) {
              if (msg.type === 'combat') {
                addToast('combat', msg.title, msg.body);
              } else if (msg.type === 'espionage') {
                addToast('info', msg.title, msg.body);
              } else if (msg.type === 'colonization') {
                addToast('info', msg.title, msg.body);
              }
            }

            useGameStore.setState({ messages: msgs });
          }
        });
      }
    }, TICK_INTERVAL);

    return () => clearInterval(interval);
  }, []);
}
