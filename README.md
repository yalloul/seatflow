# SeatFlow

Projet académique de billetterie en français : choix de places SVG, blocage temporaire, paiement simulé, billets et contrôle d'entrée. Les prix sont en MAD. Le jeu de données est **strictement local**.

## Prérequis et démarrage

Docker Desktop avec Docker Compose. Depuis la racine :

```sh
docker compose up --build
```

Ouvrir http://localhost:5173 ; API http://localhost:8080 ; OpenAPI http://localhost:8080/docs. Le port PostgreSQL côté hôte est 55432 pour éviter le port 5432 déjà occupé sur la machine de préparation. Pour arrêter : `docker compose down`. Pour repartir d'une base neuve : `docker compose down -v` (supprime les données locales).

Tests backend avec Maven installé : `cd backend && mvn test` (Docker doit être accessible à Testcontainers). Sur cette machine, sans Maven local : `docker build --target build -t seatflow-build backend` puis `docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -e TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal seatflow-build mvn -B test`. Vérification frontend : `cd frontend && npm ci && npm run build`.

## Comptes locaux

Mot de passe commun : `demo1234` (modifiable par `DEMO_PASSWORD`). Comptes : `client`, `abonne` (place fixe), `prioritaire` (fenêtre prioritaire), `organisateur`, `controleur`, `admin`. HTTP Basic est employé pour cette démonstration locale ; aucune de ces valeurs n'est destinée à Internet.

## Démonstration en 6 minutes

1. Ouvrir la liste : Symphonie Atlas et Les Nuits Horizon sont simultanés dans deux salles.
2. Ouvrir Symphonie Atlas : voir la place protégée de l'abonné et une place bloquée ; l’événement 4 contient une place vendue.
3. Se connecter comme `client`, sélectionner une place, la bloquer, voir le compte à rebours.
4. Confirmer le paiement **simulé**, ouvrir « Mes billets » et copier le code du billet.
5. Se connecter comme `controleur`, ouvrir Contrôle, sélectionner l'événement et vérifier deux fois le code : valide, puis déjà utilisé.
6. Se connecter comme `abonne` et `prioritaire` pour voir les deux formules ; comme `organisateur` pour consulter les ventes.

## Documentation

[Architecture](docs/ARCHITECTURE.md) · [Règles métier](docs/BUSINESS_RULES.md) · [API](docs/API.md) · [Rapport de tests](docs/TEST_REPORT.md) · [Guide d'entretien](docs/INTERVIEW_GUIDE.md) · [CV et pitch](docs/CV_AND_PITCH.md)

Les cinq [visuels de démonstration](frontend/public/images/README.md) illustrent l’accueil et les événements fictifs. Ils sont inclus localement dans le projet.

## Versions et portée

Java 21, Spring Boot 3.5.16, Maven 3.9.11, PostgreSQL 16, Node 22, React 19, TypeScript 5.9, Next.js 16.3.8 (App Router). Spring Boot 3.5 est compatible Java 21 selon sa [documentation officielle](https://docs.spring.io/spring-boot/3.5/system-requirements.html). Next.js 16.3.8 est la version corrigée de sécurité annoncée le 30 septembre 2026 ; Node 22 satisfait son minimum Node 20.9. Les dépendances exactes sont enregistrées dans `frontend/package-lock.json`.

Le périmètre actuel ne remplit pas encore tous les critères du cahier des charges. Lire [le rapport](docs/TEST_REPORT.md) avant de présenter des chiffres de tests.
