// Formules de production OGame (identiques au frontend)

export interface Buildings {
  metalMine: number;
  crystalMine: number;
  deuteriumSynthesizer: number;
  solarPlant: number;
  fusionReactor: number;
  metalStorage: number;
  crystalStorage: number;
  deuteriumTank: number;
  [key: string]: number;
}

export interface ProductionRates {
  metalPerHour: number;
  crystalPerHour: number;
  deuteriumPerHour: number;
  energyProduction: number;
  energyConsumption: number;
  energyBalance: number;
  efficiency: number;
}

export type ProductionFactors = Partial<Record<string, number>>;

// Multiplicateur global de production (1.5 = +50%)
const PRODUCTION_MULTIPLIER = 1.5;

const PRODUCERS = ['metalMine', 'crystalMine', 'deuteriumSynthesizer', 'solarPlant', 'fusionReactor'] as const;

export function getFactor(factors: ProductionFactors | undefined, building: string): number {
  if (!factors) return 1;
  const v = factors[building];
  if (v === undefined || v === null) return 1;
  return Math.max(0, Math.min(1, v));
}

export function isProducer(building: string): boolean {
  return (PRODUCERS as readonly string[]).includes(building);
}

export function computeProduction(
  buildings: Buildings,
  temperature: number,
  factors?: ProductionFactors,
): ProductionRates {
  const baseMetal = 30;
  const baseCrystal = 15;

  const metalMine = buildings.metalMine || 0;
  const crystalMine = buildings.crystalMine || 0;
  const deutSynth = buildings.deuteriumSynthesizer || 0;
  const solarPlant = buildings.solarPlant || 0;
  const fusionReactor = buildings.fusionReactor || 0;

  const fMetal = getFactor(factors, 'metalMine');
  const fCrystal = getFactor(factors, 'crystalMine');
  const fDeut = getFactor(factors, 'deuteriumSynthesizer');
  const fSolar = getFactor(factors, 'solarPlant');
  const fFusion = getFactor(factors, 'fusionReactor');

  const metalProduction = Math.floor(30 * metalMine * Math.pow(1.1, metalMine) * fMetal);
  const crystalProduction = Math.floor(20 * crystalMine * Math.pow(1.1, crystalMine) * fCrystal);
  const deutProduction = Math.floor(
    10 * deutSynth * Math.pow(1.1, deutSynth) * (1.28 - 0.002 * temperature) * fDeut,
  );

  // Energie
  const solarEnergy = Math.floor(20 * solarPlant * Math.pow(1.1, solarPlant) * fSolar);
  const fusionEnergy = Math.floor(30 * fusionReactor * Math.pow(1.05, fusionReactor) * fFusion);
  const energyProduction = solarEnergy + fusionEnergy;

  const metalConsumption = Math.floor(10 * metalMine * Math.pow(1.1, metalMine) * fMetal);
  const crystalConsumption = Math.floor(10 * crystalMine * Math.pow(1.1, crystalMine) * fCrystal);
  const deutConsumption = Math.floor(20 * deutSynth * Math.pow(1.1, deutSynth) * fDeut);
  const fusionConsumption = Math.floor(10 * fusionReactor * Math.pow(1.1, fusionReactor) * fFusion);
  const energyConsumption = metalConsumption + crystalConsumption + deutConsumption + fusionConsumption;

  const efficiency = energyConsumption > 0
    ? Math.min(1, energyProduction / energyConsumption)
    : 1;

  return {
    metalPerHour: Math.floor((baseMetal + metalProduction) * efficiency * PRODUCTION_MULTIPLIER),
    crystalPerHour: Math.floor((baseCrystal + crystalProduction) * efficiency * PRODUCTION_MULTIPLIER),
    deuteriumPerHour: Math.floor(deutProduction * efficiency * PRODUCTION_MULTIPLIER),
    energyProduction,
    energyConsumption,
    energyBalance: energyProduction - energyConsumption,
    efficiency,
  };
}

// Stockage : 5000 * floor(2.5 * e^(level * 20/33))
export function computeStorage(level: number): number {
  return Math.floor(5000 * Math.floor(2.5 * Math.exp((level * 20) / 33)));
}

// Cout batiment au niveau N
export function getBuildingCost(baseCost: { metal: number; crystal: number; deuterium: number }, costFactor: number, level: number) {
  const factor = Math.pow(costFactor, level - 1);
  return {
    metal: Math.floor(baseCost.metal * factor),
    crystal: Math.floor(baseCost.crystal * factor),
    deuterium: Math.floor(baseCost.deuterium * factor),
  };
}

// Temps de construction en secondes
export function getBuildingTime(cost: { metal: number; crystal: number }, roboticsLevel: number): number {
  const base = (cost.metal + cost.crystal) / (2500 * (1 + roboticsLevel));
  return Math.max(1, Math.floor(base * 3600));
}

// Temps de recherche en secondes
export function getResearchTime(cost: { metal: number; crystal: number }, labLevel: number): number {
  const base = (cost.metal + cost.crystal) / (1000 * (1 + labLevel));
  return Math.max(1, Math.floor(base * 3600));
}
