// Données des bâtiments côté serveur (coûts et facteurs)

export interface BuildingDef {
  baseCost: { metal: number; crystal: number; deuterium: number };
  costFactor: number;
  prerequisites: {
    buildings?: Record<string, number>;
    research?: Record<string, number>;
  };
}

export const BUILDINGS: Record<string, BuildingDef> = {
  metalMine:            { baseCost: { metal: 60, crystal: 15, deuterium: 0 }, costFactor: 1.5, prerequisites: {} },
  crystalMine:          { baseCost: { metal: 48, crystal: 24, deuterium: 0 }, costFactor: 1.6, prerequisites: {} },
  deuteriumSynthesizer: { baseCost: { metal: 225, crystal: 75, deuterium: 0 }, costFactor: 1.5, prerequisites: {} },
  solarPlant:           { baseCost: { metal: 75, crystal: 30, deuterium: 0 }, costFactor: 1.5, prerequisites: {} },
  fusionReactor:        { baseCost: { metal: 900, crystal: 360, deuterium: 180 }, costFactor: 1.8, prerequisites: { buildings: { deuteriumSynthesizer: 5 }, research: { energyTech: 3 } } },
  metalStorage:         { baseCost: { metal: 1000, crystal: 0, deuterium: 0 }, costFactor: 2, prerequisites: {} },
  crystalStorage:       { baseCost: { metal: 1000, crystal: 500, deuterium: 0 }, costFactor: 2, prerequisites: {} },
  deuteriumTank:        { baseCost: { metal: 1000, crystal: 1000, deuterium: 0 }, costFactor: 2, prerequisites: {} },
  roboticsFactory:      { baseCost: { metal: 400, crystal: 120, deuterium: 200 }, costFactor: 2, prerequisites: {} },
  shipyard:             { baseCost: { metal: 400, crystal: 200, deuterium: 100 }, costFactor: 2, prerequisites: { buildings: { roboticsFactory: 2 } } },
  researchLab:          { baseCost: { metal: 200, crystal: 400, deuterium: 200 }, costFactor: 2, prerequisites: {} },
  allianceDepot:        { baseCost: { metal: 20000, crystal: 40000, deuterium: 0 }, costFactor: 2, prerequisites: {} },
  missileSilo:          { baseCost: { metal: 20000, crystal: 20000, deuterium: 1000 }, costFactor: 2, prerequisites: { buildings: { shipyard: 1 } } },
  lunarBase:            { baseCost: { metal: 20000, crystal: 40000, deuterium: 20000 }, costFactor: 2, prerequisites: {} },
  sensorPhalanx:        { baseCost: { metal: 20000, crystal: 40000, deuterium: 20000 }, costFactor: 2, prerequisites: { buildings: { lunarBase: 1 } } },
  jumpGate:             { baseCost: { metal: 2000000, crystal: 4000000, deuterium: 2000000 }, costFactor: 2, prerequisites: { buildings: { lunarBase: 1 }, research: { hyperspaceDrive: 7 } } },
};
