const CHANGELOG = [
  {
    version: '0.5.1',
    date: '2026-04-05',
    title: 'Game Loop Serveur',
    entries: [
      { type: 'new' as const, text: 'Le jeu tourne maintenant cote serveur, meme quand vous etes deconnecte' },
      { type: 'new' as const, text: 'Rattrapage automatique de la production a la reconnexion' },
      { type: 'new' as const, text: 'Constructions, recherches et flottes gerees par le serveur' },
      { type: 'fix' as const, text: 'Les ressources ne peuvent plus etre modifiees cote client (anti-triche)' },
      { type: 'improve' as const, text: 'Compteurs de ressources fluides grace a l\'interpolation locale' },
    ],
  },
  {
    version: '0.5.0',
    date: '2026-04-04',
    title: 'Phase 5 — Backend & Social',
    entries: [
      { type: 'new' as const, text: 'Systeme de comptes joueurs (inscription/connexion)' },
      { type: 'new' as const, text: 'Alliances : creation, membres, rangs, diplomatie' },
      { type: 'new' as const, text: 'Messagerie privee entre joueurs' },
      { type: 'new' as const, text: 'Classements (economie, recherche, militaire)' },
      { type: 'new' as const, text: 'Vue galaxie avec statut d\'activite des joueurs' },
      { type: 'new' as const, text: 'Deploiement Docker sur Raspberry Pi 5' },
      { type: 'new' as const, text: 'CI/CD automatique via GitHub Actions' },
    ],
  },
  {
    version: '0.4.0',
    date: '2026-04-03',
    title: 'Phase 4 — Combat & Flottes',
    entries: [
      { type: 'new' as const, text: 'Simulation de combat OGame complete (6 rounds, rapid fire, debris)' },
      { type: 'new' as const, text: 'Envoi de flottes : attaque, espionnage, transport, recyclage, colonisation' },
      { type: 'new' as const, text: 'Rapports d\'espionnage progressifs (info selon tech + sondes)' },
      { type: 'new' as const, text: 'Generation de lunes apres les batailles' },
      { type: 'new' as const, text: 'Missiles interplanetaires et antibalistiques' },
      { type: 'new' as const, text: 'Contre-espionnage et perte de sondes' },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-04-02',
    title: 'Phase 3 — Recherche & Vaisseaux',
    entries: [
      { type: 'new' as const, text: '15 technologies de recherche avec prerequis' },
      { type: 'new' as const, text: '13 types de vaisseaux (du Chasseur Leger a l\'Etoile de la Mort)' },
      { type: 'new' as const, text: '10 types de defenses planetaires' },
      { type: 'new' as const, text: 'Chantier naval et file de construction d\'unites' },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-04-01',
    title: 'Phase 2 — Batiments & Production',
    entries: [
      { type: 'new' as const, text: '17 batiments avec formules de cout OGame' },
      { type: 'new' as const, text: 'Production de ressources en temps reel' },
      { type: 'new' as const, text: 'Systeme d\'energie (centrale solaire, reacteur a fusion)' },
      { type: 'new' as const, text: 'Stockage dynamique (hangars)' },
      { type: 'new' as const, text: 'Timers de construction avec barre de progression' },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-03-31',
    title: 'Phase 1 — Fondations',
    entries: [
      { type: 'new' as const, text: 'Vue galaxie 2D avec systeme solaire interactif' },
      { type: 'new' as const, text: 'Navigation entre systemes (1 galaxie, 50 systemes, 15 positions)' },
      { type: 'new' as const, text: 'Interface de jeu avec design Kurzgesagt flat' },
    ],
  },
];

const TYPE_LABELS: Record<string, { label: string; className: string }> = {
  new: { label: 'NOUVEAU', className: 'changelog-tag new' },
  fix: { label: 'CORRECTIF', className: 'changelog-tag fix' },
  improve: { label: 'AMELIORATION', className: 'changelog-tag improve' },
};

export function Changelog() {
  return (
    <div className="buildings-page">
      <div className="page-header">
        <h2>Journal des mises a jour</h2>
      </div>

      {CHANGELOG.map((release) => (
        <div key={release.version} className="changelog-release">
          <div className="changelog-release-header">
            <span className="changelog-version">v{release.version}</span>
            <h3 className="changelog-release-title">{release.title}</h3>
            <span className="changelog-date">{release.date}</span>
          </div>
          <ul className="changelog-entries">
            {release.entries.map((entry, i) => {
              const tag = TYPE_LABELS[entry.type];
              return (
                <li key={i} className="changelog-entry">
                  <span className={tag.className}>{tag.label}</span>
                  <span className="changelog-text">{entry.text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
