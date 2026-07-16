# Strategic Warfare Online

MMO stratégique temps réel : chaque joueur contrôle une nation sur une carte
du monde partagée par tous les joueurs (un seul serveur, un seul monde
persistant). MVP actuel : sélection/possession de nation, économie qui
s'accumule en continu, et une unité militaire (infanterie) achetable et
déplaçable sur le globe en temps réel.

## Stack

- **Backend** (`server/`) : Node.js, Express, PostgreSQL, Socket.io. Boucle
  de jeu (revenus, déplacement d'unités) toutes les 3 secondes, diffusée en
  temps réel à tous les clients connectés.
- **Frontend** (`client/`) : React + Vite, globe 3D via CesiumJS. Les
  frontières des pays viennent du jeu de données Natural Earth (paquet npm
  `world-atlas`), chargé aussi bien côté serveur (pour semer la base) que
  côté client (pour l'affichage).

## Prérequis

- Node.js 20+
- PostgreSQL (16 recommandé)

## Démarrage rapide en GitHub Codespaces

Le dépôt contient un devcontainer : à l'ouverture (et à chaque redémarrage)
du Codespace, `.devcontainer/setup.sh` démarre PostgreSQL, crée la base,
installe les dépendances, applique le schéma et importe les nations.
Il ne reste qu'à lancer les deux serveurs :

```bash
# terminal 1
cd server && npm run dev
# terminal 2
cd client && npm run dev
```

puis à ouvrir le port 5173 transféré (onglet « Ports » de VS Code). Si le
Codespace existait avant ce commit, lancez une fois
`bash .devcontainer/setup.sh` à la main.

## Mise en route

### 1. Base de données

```bash
sudo -u postgres psql -c "CREATE ROLE swo LOGIN PASSWORD 'swo';"
sudo -u postgres psql -c "CREATE DATABASE swo OWNER swo;"
```

### 2. Serveur

```bash
cd server
cp .env.example .env   # ajuster si besoin (DATABASE_URL, JWT_SECRET...)
npm install
npm run migrate         # crée les tables
npm run seed             # importe les ~173 nations du monde
npm run dev               # démarre l'API + Socket.io sur :4000
```

### 3. Client

```bash
cd client
npm install
npm run dev               # démarre le client sur :5173
```

En développement le client n'a besoin d'aucune configuration : Vite fait
suivre `/api` et `/socket.io` vers le backend (localhost:4000), donc le
navigateur ne parle qu'à une seule origine — ce qui fonctionne aussi à
travers les ports transférés de Codespaces. `VITE_API_URL` ne sert qu'en
production si l'API est hébergée sur une autre origine.

Ouvrez `http://localhost:5173`. Créez un compte, cliquez sur un pays non
revendiqué pour prendre le contrôle d'une nation, achetez de l'infanterie,
sélectionnez-la puis cliquez sur la carte pour la déplacer.

## Modèle de jeu (MVP)

- **Une nation par joueur** : premier arrivé, premier servi sur chaque pays.
- **Économie** : chaque nation possédée gagne `income_rate` (50 par défaut)
  toutes les 3 secondes. L'argent d'un joueur n'est visible que par lui
  (`GET /api/nations/me`) ; la liste publique des nations
  (`GET /api/nations`) n'expose que la possession, pas les finances.
- **Unités militaires** : visibles par tous (pas de brouillard de guerre
  pour l'instant) puisque voir les mouvements de troupes ennemies fait
  partie de la tension du jeu. Actuellement un seul type (`infantry`) ;
  le catalogue (`server/src/game/unitTypes.js`) est conçu pour accueillir
  facilement navires, avions, hélicoptères, drones, véhicules terrestres
  et agents secrets plus tard.

## Prochaines étapes suggérées

- Nouveaux types d'unités (navale, aérienne, blindée) avec coûts/vitesses
  propres et déplacement contraint (terre/mer/air).
- Combat entre unités quand elles se rencontrent.
- Agents secrets / espionnage (révéler l'économie ou les mouvements d'une
  nation rivale, sabotage).
- Brouillard de guerre partiel (ne voir que les unités proches de son
  territoire ou de ses propres unités).
- Authentification plus robuste (refresh tokens, vérification d'email).
