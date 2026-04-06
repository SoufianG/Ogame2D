const CHANGELOG = [
  {
    version: '0.10.1',
    date: '2026-04-06',
    title: 'Capacite de stockage visible',
    entries: [
      { type: 'new' as const, text: 'Affichage de la capacite max des entrepots dans la barre de ressources (metal / cristal / deuterium)' },
      { type: 'new' as const, text: 'Jauge de remplissage sous chaque ressource' },
      { type: 'new' as const, text: 'Indicateur rouge quand un entrepot est plein' },
    ],
  },
  {
    version: '0.10.0',
    date: '2026-04-06',
    title: 'Notifications en jeu',
    entries: [
      { type: 'new' as const, text: 'Toasts de notification pour les evenements : construction, recherche, flotte, combat' },
      { type: 'new' as const, text: 'Notifications automatiques a l\'arrivee de flottes et a la reception de messages' },
      { type: 'new' as const, text: 'Rapports de combat et d\'espionnage signales par toast' },
      { type: 'improve' as const, text: 'Detection des changements d\'etat entre les polls serveur' },
      { type: 'improve' as const, text: 'Suppression du batiment Terraformeur (plus necessaire)' },
    ],
  },
  {
    version: '0.9.0',
    date: '2026-04-06',
    title: 'Succes, Arbre Tech & Tutoriel',
    entries: [
      { type: 'new' as const, text: '32 succes a debloquer avec recompenses en ressources (5 categories)' },
      { type: 'new' as const, text: 'Arbre technologique interactif : visualisation des recherches et prereqs' },
      { type: 'new' as const, text: 'Tutoriel pas-a-pas pour les nouveaux joueurs (11 etapes)' },
      { type: 'new' as const, text: 'Barre de progression globale des succes' },
      { type: 'new' as const, text: 'Recompenses reclamables depuis la page Succes (metal, cristal, deuterium)' },
      { type: 'improve' as const, text: 'Verification automatique des succes toutes les 30 secondes' },
      { type: 'improve' as const, text: 'Navigation Technologies et Succes dans le menu principal' },
    ],
  },
  {
    version: '0.8.0',
    date: '2026-04-06',
    title: 'Flottes, Classement & Boost Production',
    entries: [
      { type: 'new' as const, text: 'Interface complete d\'envoi de flottes : selection vaisseaux, destination, mission, cargo' },
      { type: 'new' as const, text: 'Chargement de ressources dans le cargo pour les missions Transport' },
      { type: 'new' as const, text: 'Boutons "Tout charger" et "Vider" pour le chargement rapide du cargo' },
      { type: 'new' as const, text: 'Reseau de Recherche Intergalactique fonctionnel : somme des N meilleurs labos' },
      { type: 'new' as const, text: 'Classement : planete mere, alliance, envoi de message et invitation depuis le tableau' },
      { type: 'improve' as const, text: 'Production de ressources augmentee de 50% pour un gameplay plus dynamique' },
      { type: 'improve' as const, text: 'Flottes en mouvement affichent le cargo transporte' },
      { type: 'improve' as const, text: 'Les messages serveur (combat, espionnage, etc.) sont charges automatiquement' },
      { type: 'improve' as const, text: 'Niveau effectif du laboratoire affiche dans la page Recherche (IRN)' },
      { type: 'fix' as const, text: 'Le carburant et le cargo sont correctement deduits des ressources a l\'envoi' },
    ],
  },
  {
    version: '0.7.0',
    date: '2026-04-06',
    title: 'Combat, Espionnage & Missions de Flotte',
    entries: [
      { type: 'new' as const, text: 'Moteur de combat OGame complet cote serveur (6 rounds, rapid fire, debris 30%, pillage 50%)' },
      { type: 'new' as const, text: 'Espionnage reel : rapport progressif selon niveau de technologie et nombre de sondes' },
      { type: 'new' as const, text: 'Colonisation : creation de planete a une position vide avec vaisseau de colonisation' },
      { type: 'new' as const, text: 'Transport de ressources entre planetes de joueurs' },
      { type: 'new' as const, text: 'Recyclage : collecte des debris avec recycleurs' },
      { type: 'new' as const, text: 'Champs de debris generes apres chaque bataille' },
      { type: 'new' as const, text: 'Chance de lune apres un combat (1% par 100k debris, max 20%)' },
      { type: 'new' as const, text: 'Reconstruction automatique de 70% des defenses detruites' },
      { type: 'new' as const, text: 'Messages de combat envoyes aux deux joueurs (attaquant et defenseur)' },
      { type: 'new' as const, text: 'Contre-espionnage : perte de sondes et alerte au defenseur' },
    ],
  },
  {
    version: '0.6.0',
    date: '2026-04-06',
    title: 'Chantier Naval, Galaxie & Interface',
    entries: [
      { type: 'new' as const, text: 'Construction de vaisseaux et defenses cote serveur avec file d\'attente' },
      { type: 'new' as const, text: 'La vue Galaxie affiche les planetes de tous les joueurs en temps reel' },
      { type: 'new' as const, text: 'Barre de ressources visible sur toutes les pages' },
      { type: 'new' as const, text: 'Ressources affichees a cote de chaque planete dans l\'apercu' },
      { type: 'new' as const, text: 'Messages et Courrier fusionnes en un seul onglet avec badge de notification' },
      { type: 'new' as const, text: 'Renommage de planete en cliquant sur son nom' },
      { type: 'new' as const, text: 'Icones de ressources (metal, cristal, deuterium) sur toutes les cartes' },
      { type: 'improve' as const, text: 'Apercu repense : planete courante en grand, autres en miniature' },
      { type: 'improve' as const, text: 'Sections collapsibles pour la flotte a quai et les defenses' },
      { type: 'improve' as const, text: 'Progression construction et recherche visibles depuis l\'apercu' },
      { type: 'fix' as const, text: 'Timers de construction bases sur des timestamps absolus (resistant aux restarts serveur)' },
      { type: 'fix' as const, text: 'Rattrapage des files de construction au demarrage du serveur' },
      { type: 'fix' as const, text: 'Les constructions terminees pendant une absence sont correctement appliquees' },
    ],
  },
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
