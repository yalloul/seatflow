# Rapport de tests

## Migration Angular — 27 octobre 2026

Environnement local : macOS, Node 24.12.0, npm 11.6.2, Angular 21.2.25, CLI/build 21.2.28, TypeScript 5.9.3, Vitest 4.1.12, Docker 29.2.1. Backend compilé et testé en Java 21 dans l’image Maven, avec PostgreSQL 16 Testcontainers.

| Vérification exécutée                                  | Résultat                                                                                                                                |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build`                                        | compilation de production réussie, templates stricts ; routes chargées à la demande                                                     |
| `npm test`                                             | 2 fichiers, **5 tests réussis** : sélection souris/clavier, place bloquée, interaction désactivée, mauvais mot de passe et panne réseau |
| `npm audit` après correction d’Undici                  | 0 vulnérabilité signalée au moment de la vérification                                                                                   |
| `mvn -B test` dans Docker/Testcontainers               | **14 tests, 0 échec, 0 erreur, 0 ignoré**                                                                                               |
| Flyway sur bases vierges Testcontainers                | V1 à V5 appliquées avec succès                                                                                                          |
| Serveur Angular de développement, port temporaire 5174 | démarrage réussi ; `/api/events` renvoie HTTP 200 et quatre événements via le proxy                                                     |

Les neuf tests `AngularWorkflowTest` couvrent : connexion correcte et incorrecte, session et déconnexion ; CSRF et rôles ; libération/reprise et refus de paiement d’un blocage libéré ; propriété des blocages et sérialisation HTTP ; idempotence et corps différent ; paiement invalide sans consommation du blocage ; images et 404 ; création d’événement invalide ; ajout d’événements et billets d’abonnement selon la salle.

Les cinq tests `ReservationConcurrencyTest` couvrent aussi l’atomicité, l’expiration et les places fixes. Le scénario des 100 tâches est répété trois fois. Il utilise une barrière de départ et vérifie un seul blocage actif en base. Les conflits métier sont distingués des exceptions inattendues. Il s’agit de concurrence sur les **blocages**, avec appels directs au service ; ce test seul ne constitue pas une mesure de charge ni une preuve de parcours HTTP complet de 100 achats.

Un premier essai de la nouvelle annulation a révélé une trace d’audit sans identifiant d’entité ; le défaut a été corrigé avant les 14 tests réussis. La construction Docker a également détecté un verrou npm incomplet pour des dépendances natives Linux ; une tentative avec npm 10 sous Linux a rencontré une erreur interne ; le verrou complet a été régénéré avec npm 11 dans un dossier sans node_modules. L’installation `npm ci` a ensuite réussi sous Linux dans Docker et sous macOS.

Les essais de compilation native lancés dans le sandbox macOS ont été interrompus avec le code 134. Le même build exécuté avec les permissions nécessaires a réussi. Les tests Angular ont également réussi hors sandbox. Ce résultat ne remplace pas une exécution de CI distante ; les statuts des jobs GitHub Actions n’ont pas été consultés dans cette session.

Le script `scripts/smoke.py` conserve un parcours HTTP reproductible : session/CSRF, autorisations, réservation consultable, propriété, annulation, commande, nouvelle tentative idempotente, billet et contrôle unique. Il crée une commande et un billet utilisé dans la base locale. Son exécution sur http://localhost:5173 a renvoyé **PASS** pour les douze contrôles nommés, avec événement 1, `event_seat_id=6`, commande 2 et billet 4. Le contrôle du billet a donné `VALID`, puis `ALREADY_USED`.

La construction `docker compose up -d --build web` a réussi avec `npm ci` et le build Angular dans l’image Node 22, puis démarrage Nginx, API et PostgreSQL. Les données de cette configuration sont stockées dans le volume nommé. La lecture SQL confirme les migrations 1 à 5 réussies et exactement un billet pour chacune des commandes 2 et 3 des vérifications.

Inspection dans le navigateur intégré : catalogue et images, connexion avec refus d’un mauvais mot de passe, connexion client, sélection d’une place à 180 MAD sur l’événement 2, blocage et compte à rebours, rechargement conservant session et blocage, paiement simulé et QR affiché dans « Mes billets ». Ce parcours a créé le billet 5 pour la commande 3. Le message de mauvais mot de passe a été rendu plus précis après inspection ; deux tests de régression couvrent les messages de connexion et de panne réseau.

Rendu vérifié au format mobile 390×844 et au format ordinateur 1440×1000. Sur la fiche mobile, la largeur de page mesurée est 390 px pour un viewport de 390 px ; le plan défile à l’intérieur de son panneau. Captures réelles : [ordinateur](screenshots/angular-desktop.png), [mobile](screenshots/angular-mobile.png), [réservation](screenshots/angular-reservation.png), [billets](screenshots/angular-billets.png).

Ces interactions de navigateur sont une vérification manuelle assistée par outil, et non une suite E2E Playwright enregistrée dans le dépôt. Les formulaires d’abonnement et de création d’événement ont été compilés ; l’attribution et la création tardive sont testées côté backend. Leurs soumissions complètes dans le navigateur n’ont pas encore été couvertes par cette vérification.

La phase E2E automatisée multi-navigateurs, les tests de charge, les pannes de paiement asynchrone et les frontières temporelles concurrentes restent des évolutions. Les résultats ci-dessous datent de la version antérieure du 6 octobre ; ils sont conservés comme historique.

## Historique — 6 octobre 2026

Date : 6 octobre 2026. Environnement : macOS, Docker 29.2.1 / Compose 5.0.2, Java local 25.0.1 (conteneur Java 21), Node local 24.12.0, PostgreSQL 16 en conteneur. Maven n'est pas installé localement. Les tests ci-dessous ont été réalisés sur la base locale de démonstration, et non sur une instance de production.

## Commandes et résultats observés

| Vérification                                   | Résultat                                                                                                                                            |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker compose build api`                     | image backend construite avec Java 21                                                                                                               |
| `docker compose up -d --build`                 | premier essai en échec : port 5432 occupé ; port hôte changé à 55432                                                                                |
| Migration Flyway V1                            | premier essai en échec : fonction non immuable dans l'exclusion GiST ; bornes occupées explicites ajoutées                                          |
| Migration Flyway V2                            | essai en échec : donnée de démonstration mal formée, puis séquence avancée par rollback ; corrections appliquées sans supprimer de données          |
| `docker compose up -d --build api`             | migrations V2 puis V3 appliquées, `Started SeatFlowApplication` dans les journaux                                                                   |
| `curl http://localhost:8080/api/events`        | HTTP 200, quatre événements et deux salles                                                                                                          |
| Parcours HTTP local                            | blocage HTTP 200 ; commande `PAID` HTTP 200 ; répétition de la même clé renvoie la même commande ; un billet ; contrôle `VALID` puis `ALREADY_USED` |
| `npm run build` avec Next.js 16.3.8            | compilation et contrôle TypeScript réussis ; route `/` générée                                                                                      |
| `npm install` dans `frontend`                  | terminé avec 0 vulnérabilité signalée par npm audit                                                                                                 |
| `docker compose up -d --build web`             | image Next.js créée et conteneur démarré                                                                                                            |
| `curl http://localhost:5173/`                  | HTTP 200, HTML SeatFlow et « Les événements »                                                                                                       |
| `curl http://localhost:5173/api/events`        | HTTP 200, quatre événements via le proxy Next.js                                                                                                    |
| Lecture PostgreSQL de V3                       | migrations 1, 2 et 3 réussies ; une place `SOLD` sur l’événement 4                                                                                  |
| Inspection Safari après intégration des images | accueil Next.js et quatre affiches d’événements affichés ; titres lisibles sur les images ; plan détaillé non inspecté dans cette session           |

## 100 acheteurs pour une place

Script local Python utilisant `ThreadPoolExecutor(max_workers=100)` et une barrière pour libérer 100 requêtes `/holds` au même instant. Après blocage réussi, le gagnant appelle `/orders` avec paiement simulé `success`. Les autres reçoivent un conflit. Trois répétitions sur trois places distinctes de l'événement 2 :

| Série | `event_seat.id` | Acheteurs | `PAID` | HTTP 409 | Autres erreurs | Durée mesurée par le script |
| ----- | --------------: | --------: | -----: | -------: | -------------: | --------------------------: |
| 1     |              72 |       100 |      1 |       99 |              0 |                      1,99 s |
| 2     |              73 |       100 |      1 |       99 |              0 |                      1,83 s |
| 3     |              74 |       100 |      1 |       99 |              0 |                      1,68 s |

Lecture SQL finale : chacune des places 72, 73 et 74 est `SOLD`, avec **1 `order_item` et 1 `ticket`**. Un scénario préalable de 100 holds, répété trois fois sur les places 69, 70 et 71, a également donné 1 HTTP 200 et 99 HTTP 409 par série, avec 1 hold actif par place en base.

Ces durées sont celles de ce script local, pas un test de charge contrôlé. Elles n'établissent ni débit soutenu ni percentiles de latence. Le script HTTP doit encore être conservé comme fichier reproductible ; le test JUnit des holds concurrents est dans `ReservationConcurrencyTest`.

## Tests non encore exécutés ou incomplets

Le test JUnit/Testcontainers a été exécuté dans l’image Maven préparée avec le socket Docker local : `docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -e TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal seatflow-build mvn -B test`. Résultat exact : **5 tests, 0 échec, 0 erreur, 0 ignoré ; BUILD SUCCESS**. Flyway V1, V2 et V3 ont été appliquées sur un PostgreSQL Testcontainers vierge. Le test de 100 holds est répété trois fois et interroge la base ; les deux nouveaux tests couvrent le refus d’un abonnement fixe sur une place bloquée et la protection sur tous les événements éligibles. Aucun test Playwright ni scénario de charge distinct n'a été exécuté. Les tests d'autorisations API, horaires concurrents, fuseau, abonnements tardifs et frontend restent à compléter. L'inspection mobile et du plan détaillé reste à faire.
