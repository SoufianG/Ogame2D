import type { Planet } from '../types';
import type { BuildingType } from '../types/building';
import type { ResearchType } from '../types/research';

interface Prerequisites {
  buildings?: Partial<Record<BuildingType, number>>;
  research?: Partial<Record<ResearchType, number>>;
}

export interface MissingPrerequisite {
  type: 'building' | 'research';
  id: string;
  name: string;
  required: number;
  current: number;
}

export function checkPrerequisites(
  prereqs: Prerequisites,
  planet: Planet,
  research: Record<ResearchType, number>,
): MissingPrerequisite[] {
  const missing: MissingPrerequisite[] = [];

  if (prereqs.buildings) {
    for (const [id, required] of Object.entries(prereqs.buildings)) {
      const current = planet.buildings[id as BuildingType] ?? 0;
      if (current < required!) {
        missing.push({
          type: 'building',
          id,
          name: id,
          required: required!,
          current,
        });
      }
    }
  }

  if (prereqs.research) {
    for (const [id, required] of Object.entries(prereqs.research)) {
      const current = research[id as ResearchType] ?? 0;
      if (current < required!) {
        missing.push({
          type: 'research',
          id,
          name: id,
          required: required!,
          current,
        });
      }
    }
  }

  return missing;
}

export function canAfford(
  cost: { metal: number; crystal: number; deuterium: number },
  resources: { metal: number; crystal: number; deuterium: number },
): boolean {
  return (
    resources.metal >= cost.metal &&
    resources.crystal >= cost.crystal &&
    resources.deuterium >= cost.deuterium
  );
}
