# Architecture

## Modules et responsabilités

`identity` configure les comptes locaux et les rôles ; `event` expose le catalogue et crée les événements ; `reservation` bloque les places et confirme les commandes ; `seasonpass` attribue les abonnements ; `ticketing` valide l'entrée ; `shared` gère les erreurs et le flux SSE. `venue` et `reporting` sont représentés dans le schéma et les endpoints d'administration, mais ne sont pas encore des modules Java séparés.

```mermaid
flowchart LR
 UI[Angular / SVG] -->|REST et cookie de session| PROXY[Nginx ou proxy Angular]
 PROXY --> API[Spring Boot]
 API -->|JDBC transactionnel| PG[(PostgreSQL)]
 API -->|SSE disponibilité| UI
 API --> PAY[Simulateur de paiement local]
```

## Données

```mermaid
erDiagram
 APP_USER ||--o{ SEASON_PASS : owns
 VENUE ||--o{ HALL : contains
 HALL ||--o{ SECTOR : contains
 HALL ||--o{ SEAT : contains
 HALL ||--o{ EVENT : hosts
 SEASON ||--o{ EVENT : groups
 SEASON ||--o{ SEASON_PASS : grants
 EVENT ||--o{ EVENT_SEAT : snapshots
 SEAT ||--o{ EVENT_SEAT : appears
 EVENT_SEAT ||--o{ SEAT_HOLD : blocked_by
 EVENT_SEAT ||--o| ORDER_ITEM : sold_as
 CUSTOMER_ORDER ||--o{ ORDER_ITEM : contains
 ORDER_ITEM ||--o| TICKET : issues
 TICKET ||--o| TICKET_CHECK_IN : checked
 SEASON_PASS ||--o{ SEASON_SEAT_ASSIGNMENT : protects
```

La place physique garde son identifiant. `event_seat` fige son prix et sa disponibilité pour un événement. Le plan devient `layout_frozen` à la création d'un nouvel événement via l'API ; l'édition d'une salle n'est pas exposée dans cette version. Les index uniques empêchent un deuxième `order_item` ou billet pour `event_seat`. Le billet contient un UUID imprévisible ; le QR ne contient que ce code.

## Transaction de réservation

```mermaid
sequenceDiagram
 participant C as Client
 participant A as API
 participant D as PostgreSQL
 C->>A: POST /holds (places)
 A->>D: BEGIN, SELECT event_seat FOR UPDATE en ordre croissant
 A->>D: vérifier statut et holds non expirés
 A->>D: INSERT seat_hold pour chaque place
 A->>D: COMMIT
 A-->>C: token + expiration
 C->>A: POST /orders + Idempotency-Key
 A->>D: BEGIN, verrouiller les places, vérifier expiration
 A->>D: INSERT commande, paiement, articles, billets
 A->>D: COMMIT
 A-->>C: commande
```

Le point de décision est la lecture verrouillée d'`event_seat` suivie de la vérification des holds actifs dans la **même transaction**. Les demandes concurrentes sur la même place se sérialisent. L'index partiel `one_active_hold` ajoute une contrainte de sécurité. Le blocage expire selon `expires_at` en base, même si aucun nettoyage ne tourne. Une erreur avant le commit annule l'ensemble, y compris le paiement simulé et le billet. L'isolation PostgreSQL par défaut est `READ COMMITTED` ; le verrou de ligne rend l'opération sûre pour cette clé.

## États

```mermaid
stateDiagram-v2
 [*] --> AVAILABLE
 AVAILABLE --> HELD: hold non expiré
 HELD --> AVAILABLE: expiration
 HELD --> SOLD: paiement simulé accepté
 AVAILABLE --> PASS: abonnement fixe
```

```mermaid
stateDiagram-v2
 [*] --> PAID
 [*] --> DECLINED
 PAID --> [*]
 DECLINED --> [*]
```

```mermaid
stateDiagram-v2
 [*] --> ACTIVE
 ACTIVE --> USED: contrôle valide
 ACTIVE --> CANCELLED: annulation administrative future
 USED --> [*]
```

La machine à états des commandes est volontairement réduite : le paiement simulé est synchrone. Les modes retardé et callback répété du cahier des charges restent à développer.

## Horaires, SSE et sécurité

Les instants sont des `TIMESTAMPTZ`. L'interface utilise `Africa/Casablanca`. La contrainte d'exclusion GiST empêche le chevauchement des périodes occupées, préparation et libération incluses, même sous concurrence. Deux salles distinctes ne se bloquent pas. SSE annonce un changement ; le frontend relit REST après l'événement ou la reconnexion. PostgreSQL reste la source de vérité.

L’authentification utilise une session Spring Security avec cookie `JSESSIONID` HttpOnly et SameSite=Lax, et un cookie `XSRF-TOKEN` que `HttpClient` Angular transmet dans `X-XSRF-TOKEN` pour les mutations. Le mot de passe n’est pas enregistré dans le navigateur. Les guards Angular facilitent la navigation ; Spring Security impose les permissions serveur. Les comptes et les sessions sont en mémoire. Une exposition publique demanderait notamment TLS, cookie Secure, comptes persistants et gestion des secrets adaptée. Les valeurs de démonstration restent locales.

## Décisions et limites

| Choix                      | Alternative             | Raison                                               |
| -------------------------- | ----------------------- | ---------------------------------------------------- |
| Monolithe modulaire        | Microservices           | Transactions entre réservation et billet simples     |
| Verrou de ligne PostgreSQL | Redis seul              | La base impose l'invariant durable                   |
| SSE                        | WebSocket               | Diffusion unidirectionnelle suffisante               |
| JDBC explicite             | JPA pour chaque requête | SQL de verrouillage et contraintes faciles à auditer |
| Paiement synchrone simulé  | Prestataire réel        | Démonstration sans argent réel                       |

Les opérations de modification des salles, cession de billet, annulation et déplacement d'événement, callbacks de paiement, comptes persistants et production sécurisée restent des évolutions. Le frontend Angular propose la création d’événement et l’acquisition des formules d’abonnement. Les salles et saisons existantes sont consultables ; leur gestion complète reste à développer.

## Frontend Angular

Les composants standalone sont répartis par écran dans `features`. `ApiService` centralise les contrats HTTP typés, `AuthService` rétablit la session avant le routage, et `AvailabilityService` partage un flux SSE. Les signals portent l’état local et les formulaires réactifs encadrent les saisies. Les routes chargent les écrans à la demande. Le guide pédagogique est dans `ANGULAR_GUIDE.md`.

V4 ajoute les chemins d’image, les paramètres d’idempotence et l’état `RELEASED` des blocages. V5 attribue les billets manquants aux abonnements fixes existants. Un billet d’abonnement n’a pas d’article de commande : son droit vient de `season_seat_assignment`. Les nouveaux billets sont attribués dans la transaction d’achat de formule ou de création d’événement éligible.

Le frontend relit les blocages actifs du compte depuis l’API. Une clé d’idempotence est associée à chaque token et au résultat demandé. Les expirations critiques sont revérifiées après acquisition des verrous avec `clock_timestamp()` ; les notifications SSE partent après commit. Le rafraîchissement périodique du plan couvre les expirations sans événement SSE.
