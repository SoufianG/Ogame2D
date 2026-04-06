import type { Planet } from '../types';

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

export function computeProduction(planet: Planet): ProductionInfo {
  const { buildings, temperature } = planet;

  // Production de base (meme sans mines)
  const baseMetal = 30;
  const baseCrystal = 15;

  // Production des mines
  const metalMine = buildings.metalMine;
  const crystalMine = buildings.crystalMine;
  const deutSynth = buildings.deuteriumSynthesizer;
  const solarPlant = buildings.solarPlant;
  const fusionReactor = buildings.fusionReactor;

  const metalProduction = Math.floor(30 * metalMine * Math.pow(1.1, metalMine));
  const crystalProduction = Math.floor(20 * crystalMine * Math.pow(1.1, crystalMine));
  const deutProduction = Math.floor(
    10 * deutSynth * Math.pow(1.1, deutSynth) * (1.28 - 0.002 * temperature)
  );

  // Energie
  const solarEnergy = Math.floor(20 * solarPlant * Math.pow(1.1, solarPlant));
  const fusionEnergy = Math.floor(30 * fusionReactor * Math.pow(1.05, fusionReactor));
  const energyProduction = solarEnergy + fusionEnergy;

  const metalConsumption = Math.floor(10 * metalMine * Math.pow(1.1, metalMine));
  const crystalConsumption = Math.floor(10 * crystalMine * Math.pow(1.1, crystalMine));
  const deutConsumption = Math.floor(20 * deutSynth * Math.pow(1.1, deutSynth));
  const fusionConsumption = Math.floor(10 * fusionReactor * Math.pow(1.1, fusionReactor));
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
