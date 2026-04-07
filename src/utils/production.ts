import type { Planet } from '../types';
import type { BuildingType } from '../types/building';

export type ProductionFactors = Partial<Record<BuildingType, number>>;

const PRODUCERS: BuildingType[] = ['metalMine', 'crystalMine', 'deuteriumSynthesizer', 'solarPlant', 'fusionReactor'];
// Batiments avec slider (consomment une ressource : energie ou deuterium)
const SLIDER_BUILDINGS: BuildingType[] = ['metalMine', 'crystalMine', 'deuteriumSynthesizer', 'fusionReactor'];

export function isProducerBuilding(building: BuildingType): boolean {
  return PRODUCERS.includes(building);
}

export function hasProductionSlider(building: BuildingType): boolean {
  return SLIDER_BUILDINGS.includes(building);
}

function getFactor(factors: ProductionFactors | undefined, building: BuildingType): number {
  if (!factors) return 1;
  const v = factors[building];
  if (v === undefined || v === null) return 1;
  return Math.max(0, Math.min(1, v));
}

// Formules de production OGame (simplifiees)
// Production metal par heure = 30 * level * 1.1^level
// Production cristal par heure = 20 * level * 1.1^level
// Production deuterium par heure = 10 * level * 1.1^level * (1.28 - 0.002 * temperature)
// Production energie solaire = 20 * level * 1.1^level
// Consommation energie mines = 10 * level * 1.1^level

export interface ProductionInfo {
  metalPerHour: number;
  crystalPerHour: number;
  deuteriumPerHour: number;
  energyProduction: number;
  energyConsumption: number;
  energyBalance: number;
  efficiency: number; // 0-1, ratio si deficit d'energie
}

// Multiplicateur global de production (1.5 = +50%)
const PRODUCTION_MULTIPLIER = 1.5;

export function computeProduction(planet: Planet, overrideFactors?: ProductionFactors): ProductionInfo {
  const { buildings, temperature } = planet;
  const factors = overrideFactors ?? planet.productionFactors;

  // Production de base (meme sans mines)
  const baseMetal = 30;
  const baseCrystal = 15;

  // Production des mines
  const metalMine = buildings.metalMine;
  const crystalMine = buildings.crystalMine;
  const deutSynth = buildings.deuteriumSynthesizer;
  const solarPlant = buildings.solarPlant;
  const fusionReactor = buildings.fusionReactor;

  const fMetal = getFactor(factors, 'metalMine');
  const fCrystal = getFactor(factors, 'crystalMine');
  const fDeut = getFactor(factors, 'deuteriumSynthesizer');
  const fSolar = getFactor(factors, 'solarPlant');
  const fFusion = getFactor(factors, 'fusionReactor');

  const metalProduction = Math.floor(30 * metalMine * Math.pow(1.1, metalMine) * fMetal);
  const crystalProduction = Math.floor(20 * crystalMine * Math.pow(1.1, crystalMine) * fCrystal);
  const deutProduction = Math.floor(
    10 * deutSynth * Math.pow(1.1, deutSynth) * (1.28 - 0.002 * temperature) * fDeut
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

  const energyBalance = energyProduction - energyConsumption;
  const efficiency = energyConsumption > 0
    ? Math.min(1, energyProduction / energyConsumption)
    : 1;

  return {
    metalPerHour: Math.floor((baseMetal + metalProduction) * efficiency * PRODUCTION_MULTIPLIER),
    crystalPerHour: Math.floor((baseCrystal + crystalProduction) * efficiency * PRODUCTION_MULTIPLIER),
    deuteriumPerHour: Math.floor(deutProduction * efficiency * PRODUCTION_MULTIPLIER),
    energyProduction,
    energyConsumption,
    energyBalance,
    efficiency,
  };
}

// Stockage selon niveau du hangar : 5000 * floor(2.5 * e^(level * 20/33))
export function computeStorage(level: number): number {
  return Math.floor(5000 * Math.floor(2.5 * Math.exp((level * 20) / 33)));
}

// Production brute d'une mine a un niveau donne (sans efficacite, sans multiplicateur global)
// Multipliee par le PRODUCTION_MULTIPLIER pour matcher ce que le joueur voit a l'ecran en rythme nominal
const PRODUCTION_MULTIPLIER_UI = 1.5;

export function computeRawProductionDelta(building: BuildingType, planet: Planet): number {
  const level = planet.buildings[building];
  const next = level + 1;
  const temp = planet.temperature;
  switch (building) {
    case 'metalMine': {
      const prev = Math.floor(30 * level * Math.pow(1.1, level));
      const now = Math.floor(30 * next * Math.pow(1.1, next));
      return Math.floor((now - prev) * PRODUCTION_MULTIPLIER_UI);
    }
    case 'crystalMine': {
      const prev = Math.floor(20 * level * Math.pow(1.1, level));
      const now = Math.floor(20 * next * Math.pow(1.1, next));
      return Math.floor((now - prev) * PRODUCTION_MULTIPLIER_UI);
    }
    case 'deuteriumSynthesizer': {
      const prev = Math.floor(10 * level * Math.pow(1.1, level) * (1.28 - 0.002 * temp));
      const now = Math.floor(10 * next * Math.pow(1.1, next) * (1.28 - 0.002 * temp));
      return Math.floor((now - prev) * PRODUCTION_MULTIPLIER_UI);
    }
    default:
      return 0;
  }
}

// Apercu de la production avec un batiment monte d'un niveau
export function computeNextLevelPreview(planet: Planet, building: BuildingType) {
  const before = computeProduction(planet);
  const fakePlanet: Planet = {
    ...planet,
    buildings: { ...planet.buildings, [building]: planet.buildings[building] + 1 },
  };
  const after = computeProduction(fakePlanet);
  return {
    before,
    after,
    deltaEnergyProduction: after.energyProduction - before.energyProduction,
    deltaEnergyConsumption: after.energyConsumption - before.energyConsumption,
    deltaEnergyBalance: after.energyBalance - before.energyBalance,
    deltaMetal: after.metalPerHour - before.metalPerHour,
    deltaCrystal: after.crystalPerHour - before.crystalPerHour,
    deltaDeuterium: after.deuteriumPerHour - before.deuteriumPerHour,
  };
}
