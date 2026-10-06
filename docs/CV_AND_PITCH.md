# CV et pitch

## CV, deux lignes

SeatFlow — plateforme académique de billetterie développée avec Spring Boot, PostgreSQL, Next.js, React et TypeScript. Réservation atomique de places, abonnements de saison, paiement simulé et contrôle de billets QR.

## CV, trois points

- Modélisation PostgreSQL avec contraintes d'unicité, exclusion d'horaires et verrous transactionnels.
- Interface React responsive avec plan SVG accessible au clavier et actualisation SSE.
- Parcours local de réservation, billet QR et validation d'entrée ; tests de concurrence Testcontainers exécutés.

## Présentation 30 secondes

« J'ai construit SeatFlow pour gérer des événements avec placement. Une place physique garde son identité, mais son prix et son état sont propres à chaque événement. Au moment du blocage, PostgreSQL verrouille les places dans une transaction et refuse tout conflit. Le parcours continue avec un paiement simulé, un billet QR et un contrôle d'entrée à usage unique. L'interface React affiche le plan SVG et se met à jour par SSE. »

## Présentation 2 minutes

« SeatFlow répond à un problème de billetterie : éviter la double vente tout en offrant une expérience simple. J'ai séparé salles, événements, réservations, abonnements et billets. Le schéma PostgreSQL assure l'identité des places, la non-superposition des événements dans une salle et l'unicité des ventes. Le blocage de dix minutes est vérifié selon la date en base, même après redémarrage. La confirmation est transactionnelle ; sa clé d'idempotence gère le double clic et la nouvelle tentative après une réponse perdue. Deux abonnements existent : place fixe protégée sur les événements de saison et accès prioritaire sans place affectée. Le paiement est explicitement simulé. Après acceptation, un billet porte un code opaque qui ne contient pas de donnée personnelle. Le contrôleur peut le valider une fois. Le frontend Next.js/React propose un plan SVG avec états et légende ; SSE avertit d'un changement, puis REST fournit l'état de référence. Les tests Testcontainers de concurrence ont réussi (5 tests JUnit, 0 échec). »

## Démonstration de 5 minutes

1. Catalogue : montrer les deux événements simultanés dans deux salles.
2. Plan : expliquer les couleurs, le prix et la place protégée.
3. Client : bloquer une place, observer le compte à rebours, confirmer le paiement simulé.
4. Billets : lire le code QR opaque.
5. Contrôleur : valider une fois, puis constater « déjà utilisé ».

Compétences démontrées par le code : SQL transactionnel, Spring Security local, API REST, React/TypeScript/SVG, SSE, Flyway et Docker Compose. Aucune métrique de performance n'est revendiquée sans mesure exécutée.
