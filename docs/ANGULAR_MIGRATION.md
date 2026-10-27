# Migration Angular

Objectif : remplacer Next.js/React par Angular tout en conservant les parcours métier, le design, les images et l’API Spring Boot.

## Étapes de livraison

1. Cadrage et sauvegarde de l’état existant.
2. Corrections API : connexion vérifiée, blocages consultables et annulables, idempotence stricte, validation et images persistées.
3. Frontend Angular : composants standalone, routes, services HTTP typés, formulaires réactifs, guards et flux SSE.
4. Intégration Docker, vérifications, CI et guide Angular pour débuter.

Chaque étape cohérente produit un commit et une tentative de push sur la branche de migration. Les résultats réels sont consignés ici.

## Périmètre

Catalogue, recherche, détail et plan SVG, blocage/annulation/reprise, paiement simulé, commandes, billets avec QR, abonnements, contrôle d’entrée, tableau de bord et création d’événement.

Les évolutions de paiement asynchrone, de charge et d’outbox évoquées précédemment restent des travaux ultérieurs.

## État initial

- Dépôt : `https://github.com/yalloul/seatflow` ; commit initial `40992aa`.
- Modifications locales Next.js préexistantes : sauvegardées dans `/private/tmp/seatflow-migration-backup/pre-existing.patch` avant remplacement des fichiers obsolètes.
- Les captures existantes et les fichiers d’instructions locaux sont conservés.
- Les migrations Flyway existantes ne seront pas réécrites.

## Jalon API vérifié

Le 27 octobre 2026 : 14 tests backend réussis, 0 échec, 0 erreur, 0 ignoré, sur PostgreSQL 16 Testcontainers. Migrations V1 à V5 appliquées sur des bases vierges. Session serveur, CSRF, rôles, reprise/annulation des blocages, idempotence stricte, images persistées et billets d’abonnement fixe sont implémentés. Le test concurrent ne masque plus les exceptions inattendues comme des conflits métier.

## Frontend et intégration vérifiés

Angular 21.2.25 et CLI/build 21.2.28 sont compatibles avec le Node 24.12 local et le Node 22 des conteneurs. La compilation utilise TypeScript 5.9.3 et des templates stricts. Les composants sont standalone, les routes chargées à la demande, les appels HTTP centralisés et les formulaires métier réactifs.

- Build Angular de production réussi ; cinq tests frontend réussis.
- Verrou npm complet régénéré dans un dossier propre ; `npm ci` réussi sur macOS et Linux/Docker.
- L’override Undici dans la même version majeure corrige les alertes du graphe de build ; audit npm final : zéro vulnérabilité signalée.
- Docker compile le frontend puis sert uniquement les fichiers statiques avec Nginx. API et SSE passent par le proxy de même origine.
- PostgreSQL utilise désormais un volume nommé ; aucun ancien volume n’a été supprimé.
- Le parcours `scripts/smoke.py` a réussi ; captures et vérifications navigateur sont décrites dans `TEST_REPORT.md`.
- Le backend a été formaté pour rendre les transactions et les requêtes lisibles, sans ajout d’un formateur dans ses dépendances.

## Commits publiés

| Jalon                                  | Commit                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------- |
| Cadrage                                | `3423d33` — `docs: define Angular migration milestones`                     |
| API et migrations                      | `185f532` — `feat(api): secure sessions and complete reservation workflows` |
| Angular, Docker et CI                  | `ecb8e1e` — `feat(web): migrate Next.js frontend to standalone Angular`     |
| Guide, rapport, captures et lisibilité | commit final de cette branche ; voir `git log`                              |

Branche distante : [feat/angular-migration](https://github.com/yalloul/seatflow/tree/feat/angular-migration). Les captures préexistantes du dossier racine `screenshots/` n’ont pas été ajoutées aux commits. Les captures de cette migration sont dans `docs/screenshots/`.

## Pour apprendre après la migration

Lire `docs/ANGULAR_GUIDE.md`, puis `app.routes.ts`, le composant catalogue, `ApiService`, le composant de réservation et enfin `ReservationService.java`. Le guide explique la différence entre Angular et TypeScript, les composants, l’injection, les signals, les formulaires, les routes et la sécurité par session.

Les comptes persistants, la gestion complète des salles et saisons, les modifications/annulations d’événements, la cession de billet et le paiement asynchrone restent des évolutions explicites. Cette livraison termine la migration et les corrections de parcours décrites ici ; le cahier des charges initial plus large reste une référence pour ces travaux futurs.
