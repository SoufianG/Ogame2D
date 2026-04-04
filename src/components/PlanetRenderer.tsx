import { useMemo } from 'react';
import type { Planet, Biome } from '../types';

// === PALETTES KURZGESAGT PAR BIOME ===
// Chaque biome a des couleurs bien distinctes et saturees
// ocean: du plus profond au plus clair
// land: du plus sombre au plus clair (continents, forets, plaines)
// clouds: couleur des nuages (null = pas de nuages)
// atmosphere: couleur du glow
interface BiomePalette {
  ocean: string[];
  land: string[];
  clouds: string | null;
  atmosphere: string;
  glow: string;
}

const BIOME_PALETTES: Record<Biome, BiomePalette> = {
  glacial: {
    ocean: ['#1a4b7a', '#2d6da8', '#5b9bd5'],
    land: ['#b8d4e8', '#d4e8f5', '#eaf3fa'],
    clouds: '#e8f0f8',
    atmosphere: 'rgba(140, 200, 255, 0.12)',
    glow: 'rgba(140, 200, 255, 0.2)',
  },
  tundra: {
    ocean: ['#2a4a6b', '#3d6a8f', '#6a9ab8'],
    land: ['#6b7b8a', '#8a9aaa', '#b0bec5', '#d0dae0'],
    clouds: '#c8d5df',
    atmosphere: 'rgba(160, 180, 210, 0.10)',
    glow: 'rgba(160, 180, 210, 0.18)',
  },
  temperate: {
    ocean: ['#1a3a6e', '#2255a4', '#3b82d6', '#62a8e8'],
    land: ['#1a7a3a', '#28a048', '#4cc86a', '#8ae06a'],
    clouds: '#e0eef8',
    atmosphere: 'rgba(100, 180, 255, 0.10)',
    glow: 'rgba(80, 160, 240, 0.2)',
  },
  arid: {
    ocean: ['#8a6a30', '#a68040', '#c4a050'],
    land: ['#c49030', '#daa840', '#e8c060', '#f0d880'],
    clouds: null,
    atmosphere: 'rgba(220, 180, 80, 0.08)',
    glow: 'rgba(220, 180, 80, 0.18)',
  },
  volcanic: {
    ocean: ['#1a0a05', '#3a1510', '#5a2015'],
    land: ['#8a2a10', '#b03818', '#d05020', '#f08030'],
    clouds: null,
    atmosphere: 'rgba(255, 80, 20, 0.10)',
    glow: 'rgba(255, 80, 20, 0.2)',
  },
};

interface Props {
  planet: Planet;
  size?: number;
}

// RNG deterministe
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function planetSeed(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

// Genere un path SVG "blob" organique (forme arrondie irreguliere)
function generateBlob(
  cx: number,
  cy: number,
  baseRadius: number,
  points: number,
  irregularity: number,
  rand: () => number,
): string {
  const angles: number[] = [];
  const radii: number[] = [];

  for (let i = 0; i < points; i++) {
    const angle = (Math.PI * 2 * i) / points + (rand() - 0.5) * irregularity;
    angles.push(angle);
    radii.push(baseRadius * (0.7 + rand() * 0.6));
  }

  // Generer les points
  const pts = angles.map((a, i) => ({
    x: cx + Math.cos(a) * radii[i],
    y: cy + Math.sin(a) * radii[i],
  }));

  // Construire un path avec des courbes cubiques smooth
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length; i++) {
    const curr = pts[i];
    const next = pts[(i + 1) % pts.length];
    const midX = (curr.x + next.x) / 2;
    const midY = (curr.y + next.y) / 2;
    d += ` Q ${curr.x} ${curr.y} ${midX} ${midY}`;
  }
  d += ' Z';
  return d;
}

// Genere une bande horizontale organique (continent/ocean)
function generateBand(
  cx: number,
  cy: number,
  width: number,
  height: number,
  rand: () => number,
): string {
  const leftX = cx - width / 2;
  const rightX = cx + width / 2;
  const topY = cy - height / 2;
  const bottomY = cy + height / 2;

  // Points du haut (gauche -> droite) avec du bruit
  const steps = 6;
  const topPoints: { x: number; y: number }[] = [];
  const bottomPoints: { x: number; y: number }[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = leftX + t * (rightX - leftX);
    topPoints.push({ x, y: topY + (rand() - 0.5) * height * 0.6 });
    bottomPoints.push({ x, y: bottomY + (rand() - 0.5) * height * 0.6 });
  }

  let d = `M ${topPoints[0].x} ${topPoints[0].y}`;
  for (let i = 1; i < topPoints.length; i++) {
    const prev = topPoints[i - 1];
    const curr = topPoints[i];
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;
    d += ` Q ${prev.x} ${prev.y} ${midX} ${midY}`;
  }
  d += ` L ${topPoints[topPoints.length - 1].x} ${topPoints[topPoints.length - 1].y}`;

  // Ligne vers le bas a droite
  d += ` L ${bottomPoints[bottomPoints.length - 1].x} ${bottomPoints[bottomPoints.length - 1].y}`;

  // Points du bas (droite -> gauche)
  for (let i = bottomPoints.length - 2; i >= 0; i--) {
    const prev = bottomPoints[i + 1];
    const curr = bottomPoints[i];
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;
    d += ` Q ${prev.x} ${prev.y} ${midX} ${midY}`;
  }

  d += ' Z';
  return d;
}

export function PlanetRenderer({ planet, size = 180 }: Props) {
  const palette = BIOME_PALETTES[planet.biome];

  const shapes = useMemo(() => {
    const rand = seededRandom(planetSeed(planet.id));
    const scale = 0.6 + ((planet.size - 4) / 8) * 0.4;
    const r = (size * scale) / 2;
    const cx = size / 2;
    const cy = size / 2;

    // Nombre de patches de terre et d'ocean selon l'aquaticite
    // Plus aquatique = plus de bandes d'ocean, moins de terre
    const waterRatio = planet.aquaticity;

    // Bandes d'ocean (variations de teinte)
    const oceanBands: { path: string; color: string }[] = [];
    const oceanCount = 1 + Math.floor(waterRatio * 3);
    for (let i = 0; i < oceanCount; i++) {
      const bandCy = cy + (rand() - 0.5) * r * 1.4;
      const bandW = r * (1.2 + rand() * 0.8);
      const bandH = r * (0.25 + rand() * 0.35);
      const color = palette.ocean[Math.floor(rand() * palette.ocean.length)];
      oceanBands.push({
        path: generateBand(cx, bandCy, bandW, bandH, rand),
        color,
      });
    }

    // Blobs de terre (continents)
    const landBlobs: { path: string; color: string }[] = [];
    const landCount = 3 + Math.floor((1 - waterRatio) * 4);
    for (let i = 0; i < landCount; i++) {
      const blobCx = cx + (rand() - 0.5) * r * 1.3;
      const blobCy = cy + (rand() - 0.5) * r * 1.3;
      const blobR = r * (0.15 + rand() * 0.35);
      const points = 5 + Math.floor(rand() * 4);
      const color = palette.land[Math.floor(rand() * palette.land.length)];
      landBlobs.push({
        path: generateBlob(blobCx, blobCy, blobR, points, 0.6, rand),
        color,
      });
    }

    // Nuages (petits blobs clairs)
    const cloudBlobs: { path: string }[] = [];
    if (palette.clouds) {
      const cloudCount = 2 + Math.floor(rand() * 3);
      for (let i = 0; i < cloudCount; i++) {
        const cCx = cx + (rand() - 0.5) * r * 1.4;
        const cCy = cy + (rand() - 0.5) * r * 1.0;
        const cR = r * (0.1 + rand() * 0.2);
        cloudBlobs.push({
          path: generateBlob(cCx, cCy, cR, 5 + Math.floor(rand() * 3), 0.5, rand),
        });
      }
    }

    return { r, cx, cy, oceanBands, landBlobs, cloudBlobs };
  }, [planet.id, planet.size, planet.biome, planet.aquaticity, size, palette]);

  const { r, cx, cy, oceanBands, landBlobs, cloudBlobs } = shapes;

  return (
    <div
      className="planet-renderer"
      style={{ width: size, height: size, position: 'relative' }}
    >
      {/* Glow */}
      <div
        style={{
          position: 'absolute',
          width: r * 2 + 50,
          height: r * 2 + 50,
          left: (size - r * 2 - 50) / 2,
          top: (size - r * 2 - 50) / 2,
          borderRadius: '50%',
          background: palette.glow,
          filter: 'blur(25px)',
        }}
      />

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <defs>
          <clipPath id={`planet-clip-${planet.id}`}>
            <circle cx={cx} cy={cy} r={r} />
          </clipPath>
          <radialGradient
            id={`planet-light-${planet.id}`}
            cx="0.35"
            cy="0.35"
            r="0.65"
          >
            <stop offset="0%" stopColor="white" stopOpacity="0.12" />
            <stop offset="50%" stopColor="white" stopOpacity="0" />
            <stop offset="100%" stopColor="black" stopOpacity="0.25" />
          </radialGradient>
        </defs>

        {/* Anneau d'atmosphere */}
        <circle
          cx={cx}
          cy={cy}
          r={r + 4}
          fill="none"
          stroke={palette.atmosphere}
          strokeWidth="6"
        />

        {/* Fond ocean (couleur la plus profonde) */}
        <circle cx={cx} cy={cy} r={r} fill={palette.ocean[0]} />

        <g clipPath={`url(#planet-clip-${planet.id})`}>
          {/* Bandes d'ocean (variations) */}
          {oceanBands.map((band, i) => (
            <path key={`ocean-${i}`} d={band.path} fill={band.color} />
          ))}

          {/* Blobs de terre */}
          {landBlobs.map((blob, i) => (
            <path key={`land-${i}`} d={blob.path} fill={blob.color} />
          ))}

          {/* Nuages */}
          {cloudBlobs.map((cloud, i) => (
            <path
              key={`cloud-${i}`}
              d={cloud.path}
              fill={palette.clouds!}
              opacity={0.6}
            />
          ))}

          {/* Eclairage doux */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill={`url(#planet-light-${planet.id})`}
          />
        </g>

        {/* Bordure subtile */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}
