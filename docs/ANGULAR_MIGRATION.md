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
