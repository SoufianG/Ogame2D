# OGame2D — Journal de bord

## [2026-04-05] Game Loop Serveur + Frontend API-driven

**Le changement majeur** : le jeu tourne maintenant cote serveur, meme quand les joueurs sont deconnectes.

### Serveur — Game Loop (`server/src/engine/`)

| Fichier | Role |
|---|---|
| `gameLoop.ts` | Boucle de jeu (tick toutes les 5s) |
| `production.ts` | Formules de production OGame cote serveur |
| `data/buildings.ts` | Couts et prerequis des batiments |
| `data/research.ts` | Couts et prerequis des recherches |

**Ce que fait le tick (toutes les 5 secondes) :**
1. **Production** — calcule metal/cristal/deuterium pour TOUTES les planetes, avec caps de stockage
2. **Construction** — decremente les timers, finalise le batiment quand remaining_time <= 0
3. **Recherche** — idem
4. **Flottes** — quand une flotte arrive : combat NPC (butin + pertes aleatoires), espionnage (rapport), puis retour des survivants avec le cargo

**Rattrapage offline (`catchUp`)** : appele au login, recalcule toute la production accumulee depuis la derniere connexion.

### Nouveaux endpoints API

| Endpoint | Description |
|---|---|
| `GET /api/game/state` | Etat complet du joueur (planetes + production + queues + flottes + recherche) |
| `POST /api/game/build` | Lancer une construction (validation couts/prerequis serveur) |
| `POST /api/game/build/cancel` | Annuler + remboursement des ressources |
| `POST /api/game/research/start` | Lancer une recherche |
| `POST /api/game/research/cancel` | Annuler + remboursement |
| `POST /api/game/fleet/send` | Envoyer une flotte (calcul distance/vitesse/carburant serveur) |

### Frontend — Passage API-driven

**Avant** : le store Zustand calculait tout localement (production, timers, combats). Le serveur n'etait qu'un stockage passif.

**Apres** : le serveur est la source de verite.

| Fichier | Changement |
|---|---|
| `src/api/sync.ts` | Reecrit — `refreshGameState()` poll `/api/game/state`, + fonctions API pour chaque action |
| `src/store/gameStore.ts` | Simplifie — store = view model, actions appellent l'API au lieu de modifier l'etat local |
| `src/hooks/useResourceTick.ts` | Interpolation locale (1s) pour compteurs fluides + poll serveur (5s) |
| `src/hooks/useSync.ts` | Simplifie — charge l'etat au mount, plus de save periodique |
| `src/components/Buildings.tsx` | `handleClick` -> `async` (appel API) |
| `src/components/Research.tsx` | `handleClick` -> `async` |
| `src/components/Fleet.tsx` | `handleSend` -> `async` |

### Integration

| Fichier | Changement |
|---|---|
| `server/src/index.ts` | Import + appel `startGameLoop()` au demarrage, `stopGameLoop()` a l'arret |
| `server/src/routes/auth.ts` | `catchUp(userId)` appele au login avant de mettre a jour `last_login` |
| `DEPLOYMENT.md` | Documentation mise a jour avec architecture client-serveur |

---

## [2026-04-04] Phase 5 — Backend, Auth, Social, DevOps

### Backend Express + SQLite
- Serveur Express 5 + TypeScript sur Node 22
- SQLite via better-sqlite3 (leger, adapte ARM64/RPi)
- Auth JWT (bcrypt + zod validation, tokens 7 jours)
- Schema complet : users, planets, moons, research, building_queues, research_queues, fleet_movements, messages, alliances, alliance_members, alliance_diplomacy, private_messages, rankings

### Routes API
- `/api/auth` — register, login
- `/api/planets` — CRUD planetes
- `/api/game` — recherche, flottes, messages, vue galaxie
- `/api/alliance` — CRUD alliance, membres, diplomatie
- `/api/social` — messagerie privee entre joueurs
- `/api/rankings` — classement (economie, recherche, militaire)

### Frontend Social
- `Auth.tsx` — page login/register avec glassmorphism
- `Alliance.tsx` — gestion d'alliance (creation, membres, rangs, diplomatie)
- `Social.tsx` — messagerie privee (inbox, sent, compose)
- `Rankings.tsx` — classements par categorie
- `useAuth.ts` — hook login/register/logout + session JWT
- `useSync.ts` — sync etat au mount + save periodique

### Docker + CI/CD
- `Dockerfile.client` — multi-stage build React -> Nginx Alpine
- `Dockerfile.server` — multi-stage build TS -> Node Alpine (ARM64 compatible)
- `docker-compose.yml` — 2 services + volume DB
- `nginx.conf` — SPA routing + reverse proxy /api/ + gzip + cache
- `.github/workflows/ci.yml` — CI (type-check + build) + deploy SSH auto sur RPi
- Git flow : main (prod), dev (dev), feature/* (features)

### Deploiement
- Cible : Raspberry Pi 5 8Go, Docker ARM64
- IP publique : 83.196.118.48
- Deploy auto : push sur main -> GitHub Actions -> SSH -> git pull + docker compose up

---

## [2026-04-03] Phase 4 — Combat, Flottes, Espionnage, Lunes

### Combat
- `src/engine/combat.ts` — simulation de combat OGame complete (6 rounds max, rapid fire, debris, chance de lune)
- Formules fideles : attaque, bouclier, coque, rapid fire par type d'unite

### Flottes
- `src/components/Fleet.tsx` — wizard 4 etapes (selection vaisseaux, destination, mission, confirmation)
- Missions : attaque, espionnage, transport, recyclage, colonisation
- Calcul de distance, vitesse, consommation deuterium

### Espionnage
- Contre-espionnage (niveau defenseur vs attaquant)
- Information progressive (ressources, puis flotte, defenses, recherches selon niveau tech + nombre de sondes)
- Chance de perte des sondes

### Lunes
- Generation de lune apres combat (chance basee sur debris)
- Interface Moon dans les types
- Affichage dans Overview

### Missiles
- Missiles interplanetaires (portee = silo * 5 systemes)
- Missiles antibalistiques (interception)
- 12000 degats par missile * bonus tech armes
