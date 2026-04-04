import type { BuildingType } from '../types';

// Niveaux visuels :
// 0     : rien
// 1-3   : petit (4-6px)
// 4-7   : moyen (8-10px)
// 8-12  : grand (12-14px)
// 13+   : monumental (16px+)

export type VisualTier = 'none' | 'small' | 'medium' | 'large' | 'monumental';

export function getVisualTier(level: number): VisualTier {
  if (level <= 0) return 'none';
  if (level <= 3) return 'small';
  if (level <= 7) return 'medium';
  if (level <= 12) return 'large';
  return 'monumental';
}

// Couleurs par type de batiment
interface BuildingVisual {
  primary: [number, number, number];
  secondary: [number, number, number];
  accent: [number, number, number];
}

const BUILDING_VISUALS: Partial<Record<BuildingType, BuildingVisual>> = {
  metalMine: {
    primary: [120, 120, 130],   // metal gris
    secondary: [90, 90, 100],
    accent: [180, 160, 50],     // jaune industriel
  },
  crystalMine: {
    primary: [100, 130, 180],   // bleu cristallin
    secondary: [70, 100, 150],
    accent: [160, 200, 255],    // eclat cristal
  },
  deuteriumSynthesizer: {
    primary: [60, 140, 130],    // vert-bleu deut
    secondary: [40, 110, 100],
    accent: [100, 220, 200],    // lueur cyan
  },
  solarPlant: {
    primary: [160, 150, 60],    // panneaux dores
    secondary: [130, 120, 50],
    accent: [255, 230, 80],     // lumiere solaire
  },
  roboticsFactory: {
    primary: [140, 140, 150],
    secondary: [100, 100, 110],
    accent: [200, 60, 60],
  },
  shipyard: {
    primary: [110, 115, 130],
    secondary: [80, 85, 100],
    accent: [60, 180, 220],
  },
  researchLab: {
    primary: [130, 100, 160],
    secondary: [100, 70, 130],
    accent: [180, 140, 255],
  },
};

// Position angulaire de chaque batiment sur la planete (en radians, 0 = droite)
const BUILDING_SLOTS: Partial<Record<BuildingType, number>> = {
  metalMine: -0.8,
  crystalMine: -0.3,
  deuteriumSynthesizer: 0.2,
  solarPlant: 0.7,
  roboticsFactory: 1.5,
  shipyard: -1.4,
  researchLab: 2.2,
};

export interface BuildingRenderInfo {
  type: BuildingType;
  level: number;
  tier: VisualTier;
  visual: BuildingVisual;
  angle: number;
}

export function getBuildingsToRender(
  buildings: Record<BuildingType, number>
): BuildingRenderInfo[] {
  const result: BuildingRenderInfo[] = [];
  for (const [type, level] of Object.entries(buildings)) {
    const bt = type as BuildingType;
    const tier = getVisualTier(level);
    if (tier === 'none') continue;

    const visual = BUILDING_VISUALS[bt];
    const angle = BUILDING_SLOTS[bt];
    if (!visual || angle === undefined) continue;

    result.push({ type: bt, level, tier, visual, angle });
  }
  return result;
}

// Taille en pixels du sprite selon le tier
export function getSpriteSize(tier: VisualTier): number {
  switch (tier) {
    case 'small': return 3;
    case 'medium': return 4;
    case 'large': return 5;
    case 'monumental': return 6;
    default: return 0;
  }
}

// Dessine un batiment en pixel art dans un ImageData buffer
export function drawBuilding(
  data: Uint8ClampedArray,
  bufferWidth: number,
  bx: number, // position x centre
  by: number, // position y base
  info: BuildingRenderInfo,
) {
  const size = getSpriteSize(info.tier);
  if (size === 0) return;

  const { primary, secondary, accent } = info.visual;
  const halfW = Math.floor(size / 2);

  // Structure de base : rectangle avec toit
  for (let dy = 0; dy < size; dy++) {
    for (let dx = -halfW; dx <= halfW; dx++) {
      const px = Math.round(bx) + dx;
      const py = Math.round(by) - dy;
      if (px < 0 || px >= bufferWidth || py < 0 || py >= bufferWidth) continue;

      const idx = (py * bufferWidth + px) * 4;
      let color: [number, number, number];

      if (dy === size - 1) {
        // Toit / sommet
        color = accent;
      } else if (dy >= size - 2 && Math.abs(dx) <= halfW - 1) {
        // Partie haute
        color = primary;
      } else if (dy === 0) {
        // Base
        color = secondary;
      } else {
        // Corps
        color = Math.abs(dx) === halfW ? secondary : primary;
      }

      data[idx] = color[0];
      data[idx + 1] = color[1];
      data[idx + 2] = color[2];
      data[idx + 3] = 255;
    }
  }

  // Lumiere clignotante pour le tier monumental (accent au sommet)
  if (info.tier === 'monumental') {
    const px = Math.round(bx);
    const py = Math.round(by) - size;
    if (px >= 0 && px < bufferWidth && py >= 0 && py < bufferWidth) {
      const idx = (py * bufferWidth + px) * 4;
      data[idx] = Math.min(255, accent[0] + 50);
      data[idx + 1] = Math.min(255, accent[1] + 50);
      data[idx + 2] = Math.min(255, accent[2] + 50);
      data[idx + 3] = 255;
    }
  }
}
