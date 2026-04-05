// Données des recherches côté serveur (coûts et facteurs)

export interface ResearchDef {
  baseCost: { metal: number; crystal: number; deuterium: number };
  costFactor: number;
  prerequisites: {
    buildings?: Record<string, number>;
    research?: Record<string, number>;
  };
}

export const RESEARCH: Record<string, ResearchDef> = {
  espionageTech:                 { baseCost: { metal: 200, crystal: 1000, deuterium: 200 }, costFactor: 2, prerequisites: { buildings: { researchLab: 3 } } },
  computerTech:                  { baseCost: { metal: 0, crystal: 400, deuterium: 600 }, costFactor: 2, prerequisites: { buildings: { researchLab: 1 } } },
  weaponsTech:                   { baseCost: { metal: 800, crystal: 200, deuterium: 0 }, costFactor: 2, prerequisites: { buildings: { researchLab: 4 } } },
  shieldingTech:                 { baseCost: { metal: 200, crystal: 600, deuterium: 0 }, costFactor: 2, prerequisites: { buildings: { researchLab: 6 }, research: { energyTech: 3 } } },
  armourTech:                    { baseCost: { metal: 1000, crystal: 0, deuterium: 0 }, costFactor: 2, prerequisites: { buildings: { researchLab: 2 } } },
  combustionDrive:               { baseCost: { metal: 400, crystal: 0, deuterium: 600 }, costFactor: 2, prerequisites: { buildings: { researchLab: 1 }, research: { energyTech: 1 } } },
  impulseDrive:                  { baseCost: { metal: 2000, crystal: 4000, deuterium: 600 }, costFactor: 2, prerequisites: { buildings: { researchLab: 2 }, research: { energyTech: 1 } } },
  hyperspaceDrive:               { baseCost: { metal: 10000, crystal: 20000, deuterium: 6000 }, costFactor: 2, prerequisites: { buildings: { researchLab: 7 }, research: { energyTech: 5, shieldingTech: 5 } } },
  energyTech:                    { baseCost: { metal: 0, crystal: 800, deuterium: 400 }, costFactor: 2, prerequisites: { buildings: { researchLab: 1 } } },
  laserTech:                     { baseCost: { metal: 200, crystal: 100, deuterium: 0 }, costFactor: 2, prerequisites: { buildings: { researchLab: 1 }, research: { energyTech: 2 } } },
  ionTech:                       { baseCost: { metal: 1000, crystal: 300, deuterium: 100 }, costFactor: 2, prerequisites: { buildings: { researchLab: 4 }, research: { energyTech: 4, laserTech: 5 } } },
  plasmaTech:                    { baseCost: { metal: 2000, crystal: 4000, deuterium: 1000 }, costFactor: 2, prerequisites: { buildings: { researchLab: 4 }, research: { energyTech: 8, laserTech: 10, ionTech: 5 } } },
  intergalacticResearchNetwork:  { baseCost: { metal: 240000, crystal: 400000, deuterium: 160000 }, costFactor: 2, prerequisites: { buildings: { researchLab: 10 }, research: { computerTech: 8, hyperspaceDrive: 8 } } },
  astrophysics:                  { baseCost: { metal: 4000, crystal: 8000, deuterium: 4000 }, costFactor: 1.75, prerequisites: { buildings: { researchLab: 3 }, research: { espionageTech: 4, impulseDrive: 3 } } },
  gravitonTech:                  { baseCost: { metal: 0, crystal: 0, deuterium: 0 }, costFactor: 3, prerequisites: { buildings: { researchLab: 12 } } },
};
