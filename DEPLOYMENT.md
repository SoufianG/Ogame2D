# OGame2D — Guide de deploiement

## Architecture

```
[Navigateur] ---> [Nginx :80] ---> fichiers statiques (SPA React)
                       |
                       +---> /api/* ---> [Express :3001] ---> [SQLite]
```

Tout tourne dans **2 containers Docker** orchestres par `docker-compose` :
- **client** : Nginx sert le frontend React builde + proxy les appels `/api/*`
- **api** : Node.js Express avec SQLite (fichier persiste dans un volume Docker)

---

## Ce qui a ete fait (Phase 5)

### Backend (`server/`)
- **Express 5** + TypeScript, leger et adapte ARM64
- **SQLite** via `better-sqlite3` (pas besoin d'un PostgreSQL pour un jeu solo/petit groupe)
- **Auth JWT** : inscription/connexion avec bcrypt, tokens 7 jours
- **API REST** :
  - `POST /api/auth/register` — inscription
  - `POST /api/auth/login` — connexion
  - `GET /api/planets` — planetes du joueur
  - `POST /api/planets` — creer la planete de depart
  - `PUT /api/planets/:id` — sauvegarder l'etat
  - `GET /api/game/research` — recherches du joueur
  - `PUT /api/game/research` — sauvegarder les recherches
  - `GET /api/game/fleets` — flottes en mouvement
  - `GET /api/game/messages` — messages/rapports
  - `GET /api/game/galaxy/:galaxy/:system` — vue galaxie
- **Schema DB** : `server/src/db/schema.sql` (users, planets, moons, research, queues, fleets, messages)

### Docker
- `Dockerfile.client` — build multi-stage : npm build > Nginx Alpine
- `Dockerfile.server` — build multi-stage : tsc > Node Alpine (avec support ARM64 pour better-sqlite3)
- `docker-compose.yml` — orchestre les 2 services + volume pour la DB
- `nginx.conf` — SPA routing + reverse proxy API + gzip + cache assets

### CI/CD (`.github/workflows/ci.yml`)
- **Sur chaque push/PR** (`main` et `dev`) : type-check + build client et server en parallele
- **Sur `main` uniquement** : build des images Docker + deploy SSH sur le RPi

### Git Flow
- `main` — branche de production, deploy auto
- `dev` — branche de developpement, CI tourne dessus
- `feature/*` — branches pour chaque feature, PR vers `dev`
- Quand `dev` est stable : PR de `dev` vers `main` = mise en prod

---

## Deploiement sur Raspberry Pi 5

### 1. Preparer le Pi

```bash
# Mettre a jour le systeme
sudo apt update && sudo apt upgrade -y

# Installer Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Deconnexion/reconnexion pour que le groupe docker prenne effet
logout
```

### 2. Cloner le repo

```bash
git clone https://github.com/SoufianG/Ogame2D.git ~/ogame2d
cd ~/ogame2d
```

### 3. Configurer l'environnement

```bash
# Creer le fichier .env a la racine du projet
cat > .env << 'EOF'
JWT_SECRET=REMPLACER_PAR_UNE_CHAINE_ALEATOIRE_LONGUE
EOF

# Generer un secret aleatoire (copier le resultat dans .env)
openssl rand -hex 32
```

### 4. Lancer le projet

```bash
docker compose build    # ~5-10 min la premiere fois sur RPi
docker compose up -d    # Lancer en arriere-plan
```

Verifier que ca tourne :
```bash
docker compose ps                        # Les 2 services doivent etre "Up"
curl http://localhost/api/health          # Doit repondre {"status":"ok",...}
```

### 5. Configurer le reseau

#### Sur la box internet :
- Aller dans l'interface d'admin de ta box (souvent 192.168.1.1)
- NAT / Redirection de ports : **port 80 externe > port 80 vers l'IP locale du Pi**
- Trouver l'IP locale du Pi : `hostname -I` sur le Pi

#### Optionnel — nom de domaine :
- Utiliser un service DynDNS gratuit (No-IP, DuckDNS, etc.)
- Ou acheter un domaine et pointer un A record vers ton IP publique
- Pour HTTPS, ajouter Certbot/Let's Encrypt plus tard

### 6. Configurer le deploy automatique (CI/CD)

Dans GitHub > Settings > Secrets and variables > Actions, ajouter :

| Secret | Valeur |
|---|---|
| `RPI_HOST` | Ton IP publique (ou domaine DynDNS) |
| `RPI_USER` | Ton user SSH sur le Pi (ex: `pi` ou `soufian`) |
| `RPI_SSH_KEY` | Le contenu de ta cle privee SSH |

#### Generer une cle SSH dediee au deploy :

```bash
# Sur le Pi
ssh-keygen -t ed25519 -f ~/.ssh/ogame2d-deploy -N ""
cat ~/.ssh/ogame2d-deploy.pub >> ~/.ssh/authorized_keys

# Copier le contenu de la cle PRIVEE pour le secret GitHub
cat ~/.ssh/ogame2d-deploy
```

#### Ouvrir le port SSH sur la box :
- NAT : **port 22 externe > port 22 vers l'IP du Pi**
- (Ou un port custom genre 2222 pour la securite, ajuster `RPI_HOST` en consequence)

### 7. Tester le deploy

```bash
# Depuis ton PC, push un changement sur main
git checkout main
git merge dev
git push origin main
```

Le workflow GitHub Actions va :
1. Type-check + build
2. Se connecter en SSH au Pi
3. `git pull` + `docker compose build` + `docker compose up -d`

---

## Commandes utiles sur le Pi

```bash
# Voir les logs
docker compose logs -f

# Redemarrer
docker compose restart

# Rebuild apres un changement
docker compose build && docker compose up -d

# Voir la taille de la DB
ls -lh ~/ogame2d/db-data/   # ou dans le volume Docker

# Backup de la DB
docker compose exec api cp /data/ogame2d.db /data/backup-$(date +%F).db

# Nettoyage Docker (images inutilisees)
docker system prune -f
```

---

## Workflow de developpement au quotidien

```bash
# 1. Creer une feature branch
git checkout dev
git pull origin dev
git checkout -b feature/ma-feature

# 2. Developper, commiter
git add .
git commit -m "Add ma feature"

# 3. Pousser et creer une PR vers dev
git push -u origin feature/ma-feature
gh pr create --base dev --title "Ma feature"

# 4. Quand la PR est mergee dans dev et stable
git checkout main
git merge dev
git push origin main   # => deploy auto sur le Pi
```
