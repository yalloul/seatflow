# Rapport de tests

Date : 6 octobre 2026. Environnement : macOS, Docker 29.2.1 / Compose 5.0.2, Java local 25.0.1 (conteneur Java 21), Node local 24.12.0, PostgreSQL 16 en conteneur. Maven n'est pas installé localement. Les tests ci-dessous ont été réalisés sur la base locale de démonstration, et non sur une instance de production.

## Commandes et résultats observés

| Vérification | Résultat |
|---|---|
| `docker compose build api` | image backend construite avec Java 21 |
| `docker compose up -d --build` | premier essai en échec : port 5432 occupé ; port hôte changé à 55432 |
| Migration Flyway V1 | premier essai en échec : fonction non immuable dans l'exclusion GiST ; bornes occupées explicites ajoutées |
| Migration Flyway V2 | essai en échec : donnée de démonstration mal formée, puis séquence avancée par rollback ; corrections appliquées sans supprimer de données |
| `docker compose up -d --build api` | migrations V2 puis V3 appliquées, `Started SeatFlowApplication` dans les journaux |
| `curl http://localhost:8080/api/events` | HTTP 200, quatre événements et deux salles |
| Parcours HTTP local | blocage HTTP 200 ; commande `PAID` HTTP 200 ; répétition de la même clé renvoie la même commande ; un billet ; contrôle `VALID` puis `ALREADY_USED` |
| `npm run build` avec Next.js 16.3.8 | compilation et contrôle TypeScript réussis ; route `/` générée |
| `npm install` dans `frontend` | terminé avec 0 vulnérabilité signalée par npm audit |
| `docker compose up -d --build web` | image Next.js créée et conteneur démarré |
| `curl http://localhost:5173/` | HTTP 200, HTML SeatFlow et « Les événements » |
| `curl http://localhost:5173/api/events` | HTTP 200, quatre événements via le proxy Next.js |
| Lecture PostgreSQL de V3 | migrations 1, 2 et 3 réussies ; une place `SOLD` sur l’événement 4 |
| Inspection Safari après intégration des images | accueil Next.js et quatre affiches d’événements affichés ; titres lisibles sur les images ; plan détaillé non inspecté dans cette session |

## 100 acheteurs pour une place

Script local Python utilisant `ThreadPoolExecutor(max_workers=100)` et une barrière pour libérer 100 requêtes `/holds` au même instant. Après blocage réussi, le gagnant appelle `/orders` avec paiement simulé `success`. Les autres reçoivent un conflit. Trois répétitions sur trois places distinctes de l'événement 2 :

| Série | `event_seat.id` | Acheteurs | `PAID` | HTTP 409 | Autres erreurs | Durée mesurée par le script |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 72 | 100 | 1 | 99 | 0 | 1,99 s |
| 2 | 73 | 100 | 1 | 99 | 0 | 1,83 s |
| 3 | 74 | 100 | 1 | 99 | 0 | 1,68 s |

Lecture SQL finale : chacune des places 72, 73 et 74 est `SOLD`, avec **1 `order_item` et 1 `ticket`**. Un scénario préalable de 100 holds, répété trois fois sur les places 69, 70 et 71, a également donné 1 HTTP 200 et 99 HTTP 409 par série, avec 1 hold actif par place en base.

Ces durées sont celles de ce script local, pas un test de charge contrôlé. Elles n'établissent ni débit soutenu ni percentiles de latence. Le script HTTP doit encore être conservé comme fichier reproductible ; le test JUnit des holds concurrents est dans `ReservationConcurrencyTest`.

## Tests non encore exécutés ou incomplets

Le test JUnit/Testcontainers a été exécuté dans l’image Maven préparée avec le socket Docker local : `docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -e TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal seatflow-build mvn -B test`. Résultat exact : **5 tests, 0 échec, 0 erreur, 0 ignoré ; BUILD SUCCESS**. Flyway V1, V2 et V3 ont été appliquées sur un PostgreSQL Testcontainers vierge. Le test de 100 holds est répété trois fois et interroge la base ; les deux nouveaux tests couvrent le refus d’un abonnement fixe sur une place bloquée et la protection sur tous les événements éligibles. Aucun test Playwright ni scénario de charge distinct n'a été exécuté. Les tests d'autorisations API, horaires concurrents, fuseau, abonnements tardifs et frontend restent à compléter. L'inspection mobile et du plan détaillé reste à faire.
