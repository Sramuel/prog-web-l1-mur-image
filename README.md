# Projet de programmation web

Application web Node.js utilisant PostgreSQL pour gérer un mur d'images.

## Pré-requis

- Node.js et npm
- PostgreSQL

## Initialiser la base

Sur Linux, les scripts `start.sh` et `stop.sh` pilotent le service PostgreSQL :

```bash
./start.sh
psql -f application-image.sql
psql -d application_image -f auteurs.sql
psql -d application_image -f images.sql
```

Configurez le mot de passe PostgreSQL sans le mettre dans le code :

```bash
export PGPASSWORD='votre-mot-de-passe'
```

## Installer et lancer

```bash
npm install
npm start
```

Le serveur écoute sur <http://localhost:8090/>.
