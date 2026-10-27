# SeatFlow

Plateforme académique de billetterie en français : **Angular 21**, **Spring Boot / Java 21** et **PostgreSQL 16**. Choix des places sur un plan SVG, blocage de dix minutes, paiement simulé, billets QR, abonnements et contrôle d’entrée. Prix en MAD, horaires affichés dans le fuseau Africa/Casablanca.

## Démarrage avec Docker

Prérequis : Docker Desktop avec Docker Compose. Depuis la racine :

```sh
docker compose up -d --build
```

- Application : http://localhost:5173
- API : http://localhost:8080/api/events
- OpenAPI : http://localhost:8080/docs
- PostgreSQL : port hôte `55432`, base `seatflow`.

Arrêter : `docker compose down`. Le volume nommé `seatflow_data` conserve les données. `docker compose down -v` supprime les données de ce volume et permet de repartir du jeu de démonstration.

## Développement Angular

Node 22.12+ dans la branche 22, ou Node 24 compatible avec Angular 21. Les versions exactes sont verrouillées dans `frontend/package-lock.json`. Aucun CLI global nécessaire.

```sh
docker compose up -d db api
cd frontend
npm ci
npm start
```

Si le conteneur frontend est déjà lancé : `docker compose stop web` avant `npm start`, car ils partagent le port 5173. Le proxy Angular transmet `/api` au backend local ; Docker utilise Nginx pour le même rôle.

## Comptes de démonstration

Mot de passe commun : `demo1234`, configurable par `DEMO_PASSWORD`.

| Compte         | Rôle et usage                                                    |
| -------------- | ---------------------------------------------------------------- |
| `client`       | sélectionner, réserver, payer fictivement, consulter les billets |
| `abonne`       | client avec place fixe et billets de saison                      |
| `prioritaire`  | client avec accès prioritaire                                    |
| `organisateur` | ventes, salles et création d’événement                           |
| `controleur`   | vérification des billets                                         |
| `admin`        | accès aux parcours des différents rôles                          |

Connexion vérifiée par Spring Security, session serveur avec cookie HttpOnly et protection CSRF. Aucun mot de passe n’est stocké dans le navigateur. Les comptes d’authentification restent en mémoire et sont réservés à la démonstration locale. Un redémarrage backend invalide les sessions.

## Vérifications

```sh
cd frontend
npm run build
npm test
```

Backend avec Maven et Docker accessibles :

```sh
cd backend
mvn test
```

Sans Maven local, depuis la racine :

```sh
docker build --target build -t seatflow-build backend
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -e TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal seatflow-build mvn -B test
```

`TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal` convient à Docker Desktop sur macOS. Sur un poste Linux, privilégier Maven directement avec l’accès au daemon Docker.

Après démarrage de Docker, un parcours HTTP reproductible peut être lancé depuis la racine : `python3 scripts/smoke.py`. Il crée une commande locale et valide son billet à l’entrée.

GitHub Actions compile les deux parties et lance les tests backend et Angular. Les résultats locaux et leurs limites sont consignés dans le [rapport](docs/TEST_REPORT.md).

## Démonstration en six minutes

1. Catalogue : comparer les deux événements simultanés dans des salles différentes et utiliser les filtres.
2. Fiche : montrer les places libres, vendues, accessibles et réservées aux abonnés.
3. Client : bloquer une place ; quitter la fiche puis la reprendre depuis « Commandes » ; confirmer le paiement simulé.
4. Billets : présenter le QR ; se reconnecter en contrôleur et vérifier deux fois le même code.
5. Abonnements : montrer les billets fixes de `abonne` et les deux formules disponibles.
6. Organisateur : consulter les ventes et créer un événement ; expliquer le refus des chevauchements de salle.

Les cinq [images locales](frontend/public/images/README.md) illustrent des spectacles fictifs.

## Documentation

Commencer par le [guide Angular pour débuter](docs/ANGULAR_GUIDE.md), puis l’[architecture](docs/ARCHITECTURE.md), les [règles métier](docs/BUSINESS_RULES.md) et l’[API](docs/API.md).

Pour préparer un entretien : [guide d’entretien](docs/INTERVIEW_GUIDE.md), [CV et pitch](docs/CV_AND_PITCH.md), [rapport de tests](docs/TEST_REPORT.md). La [migration Angular](docs/ANGULAR_MIGRATION.md) décrit les jalons et leurs vérifications.

## Périmètre actuel

Le catalogue, la réservation atomique, les reprises/annulations de blocage, le paiement synchrone simulé, les billets QR, les deux formules d’abonnement, la création d’événement et les ventes sont implémentés. Les migrations Flyway V1 à V5 définissent le schéma et ses évolutions.

La gestion complète des salles/comptes, les modifications et annulations d’événements, la cession de billet, le paiement asynchrone et le déploiement public restent des évolutions. La phase de tests avancés E2E et de charge évoquée dans la discussion reste à réaliser.
