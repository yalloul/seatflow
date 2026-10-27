# Règles métier

1. Une place physique est unique par salle, rangée et numéro (`seat` UNIQUE). Son prix est figé dans `event_seat`.
2. Une salle ne peut accueillir deux événements dont les périodes occupées se chevauchent, préparation et libération comprises (contrainte `hall_occupied_no_overlap`). Deux salles le peuvent.
3. Un hold dure dix minutes réelles. Son expiration est déterminée par l'horloge de PostgreSQL au moment de vérifier la disponibilité. La création multi-places est une transaction : un conflit annule tout.
4. Les places sont verrouillées par ordre d'identifiant pour réduire les interblocages. Une place `SOLD` ou `PASS` ne peut être bloquée.
5. La confirmation exige `Idempotency-Key` unique par client. Une répétition avec le même token et le même résultat renvoie la commande existante ; un corps différent avec la même clé est refusé. La commande, la tentative de paiement, les articles et les billets sont dans une transaction.
6. Le simulateur accepte uniquement `success` ou `decline` ; toute autre valeur est rejetée avec 400. Aucun numéro de carte n'est collecté. Les résultats retardés et callbacks répétés ne sont pas implémentés.
7. Un billet peut être utilisé une fois. La ligne du billet est verrouillée au contrôle et `ticket_check_in.ticket_id` est unique. Mauvais événement, événement annulé et billet déjà utilisé sont refusés.
8. Un abonnement fixe protège la même place dans les événements publiés de sa salle et de sa saison au moment de l'achat. L'achat et l'ajout d'un événement éligible créent les affectations et les billets QR. Une place déjà prise fait refuser la transaction.
9. L'abonnement prioritaire ne protège aucune place. Avant `public_opens_at`, seul un abonné prioritaire de la saison peut bloquer, à partir de `priority_opens_at`.
10. Les ventes et contrôles sont inscrits dans `audit_entry`. Toutes les transitions d'état critiques ne sont pas encore couvertes, notamment l'administration des événements existants.
11. L'annulation et le déplacement d'un événement vendu ne sont pas exposés. Cela évite une annulation silencieuse ; un futur flux devra prévoir remboursements et notifications.

Exemples : le hold de la place 2 d'Atlas est déjà occupé dans la démo ; un panier contenant cette place et une place libre est entièrement rejeté. L'abonné fixe possède la place 1 sur les événements 1 et 3 ; elle apparaît `PASS` sur le plan.

12. Un blocage actif appartient à son propriétaire ; lui seul peut le reprendre, le confirmer ou le libérer. La libération prend les mêmes verrous de places que la confirmation et produit l’état `RELEASED`.
13. Une formule d’abonnement déjà possédée pour la saison ne peut être achetée une seconde fois. L’abonnement fixe donne des billets consultables dans « Mes billets ».

Tests associés : `ReservationConcurrencyTest` et `AngularWorkflowTest` couvrent concurrence de blocage, atomicité, expiration, idempotence, propriété des blocages, rôles/CSRF et attribution de billets fixes. Les scénarios d’horaires concurrents, de confirmation à la frontière temporelle et de contrôle simultané restent à compléter ; voir `TEST_REPORT.md`.
