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
revendiqué pour prendre le contrôle d'une nation, construisez une caserne
pour débloquer l'infanterie, produisez une unité (elle se déploie à la
capitale une fois fabriquée), sélectionnez-la puis cliquez sur la carte
pour la déplacer (un vecteur et une heure d'arrivée s'affichent).

## Modèle de jeu (inspiré de Supremacy 1914, version guerre moderne)

- **Une nation par joueur** : premier arrivé, premier servi sur chaque pays.
- **Économie multi-ressources** : chaque nation possédée produit en continu
  quatre ressources — 💰 argent, 🛢️ pétrole, 🏭 matériel, 👥 main-d'œuvre.
  Les stocks et la production d'un joueur ne sont visibles que par lui
  (`GET /api/nations/me`) ; la liste publique (`GET /api/nations`) n'expose
  que la possession.
- **Bâtiments** : on construit des bâtiments modernes (raffinerie, usine
  d'armement, caserne, centre financier) qui coûtent des ressources et
  prennent du temps à construire. Une fois actifs ils augmentent la
  production et/ou débloquent des types d'unités (ex : la caserne débloque
  l'infanterie). Voir `server/src/game/economy.js`.
- **Production d'unités** : les unités coûtent plusieurs ressources, exigent
  le bâtiment requis, et sortent d'une **file de production** (temps de
  fabrication) avant de se déployer sur la carte à la capitale.
- **Temps de jeu accéléré** : le monde tourne `GAME_SPEED_MULTIPLIER` fois
  plus vite que le temps réel (`server/src/game/config.js`), pour que
  constructions, productions et déplacements se jouent en minutes tout en
  gardant des vitesses d'unités réalistes.
- **Unités militaires** : visibles par tous (pas de brouillard de guerre
  pour l'instant). Un seul type déployable aujourd'hui (`infantry`) ; le
  catalogue (`server/src/game/unitTypes.js`) est prêt pour navires, avions,
  hélicoptères, drones, véhicules et agents secrets.

- **Combat** : à chaque tick, toute unité armée inflige ses dégâts à l'unité
  ennemie (d'une autre nation) la plus proche à portée ; destruction à 0 PV.
  Les PV s'affichent dans le HUD et via une barre de vie sur la carte, et le
  joueur reçoit une notification quand il perd des unités.
- **Espionnage** : un agent secret placé dans les frontières d'une nation
  rivale révèle son économie (stocks + production) et l'inventaire de ses
  forces via le panneau *Renseignement* (`GET /api/intel`).
- **Tableau des puissances** : liste en temps réel des nations contrôlées et
  de leurs joueurs (le monde est partagé par tous).

## Prochaines étapes suggérées

- Contraintes de déplacement terre/mer/air (avec apparition côtière des
  navires pour les pays maritimes).
- Conquête de territoire (capturer des pays par la force).
- Sabotage / vol de ressources par les agents secrets.
- Diplomatie : alliances, déclarations de guerre, marché de ressources.
- Agents secrets / espionnage (révéler l'économie ou les mouvements d'une
  nation rivale, sabotage).
- Brouillard de guerre partiel (ne voir que les unités proches de son
  territoire ou de ses propres unités).
- Authentification plus robuste (refresh tokens, vérification d'email).
