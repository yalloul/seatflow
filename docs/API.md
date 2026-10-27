# API REST

Base : `/api` sur http://localhost:5173 via le proxy, ou http://localhost:8080 directement. OpenAPI : http://localhost:8080/docs.

Erreurs : JSON `{"error":"..."}`, `400` requête invalide, `401` session absente/expirée, `403` rôle interdit ou jeton CSRF invalide, `404` ressource absente, `409` conflit métier.

## Authentification et CSRF

`GET /auth/csrf` est public et déclenche l’écriture de `XSRF-TOKEN`. Les mutations doivent transmettre ce cookie et l’en-tête `X-XSRF-TOKEN`. Le frontend Angular s’en charge avec `HttpClient` pour les URL relatives de même origine.

`POST /auth/login` reçoit `application/x-www-form-urlencoded` : `username=client&password=demo1234`. Le succès crée un cookie de session `JSESSIONID`. Recharger le jeton CSRF après la connexion, puis appeler `GET /auth/me` :

```json
{ "username": "client", "roles": ["CLIENT"] }
```

`POST /auth/logout` invalide la session et renvoie `204`. HTTP Basic a été remplacé par cette session. Pour un appel hors navigateur, conserver les cookies entre requêtes et copier le jeton CSRF dans les en-têtes des mutations.

## Endpoints métier

| Méthode et URL             | Rôle               | Contrat et erreurs                                                                                                                    |
| -------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| GET `/events`              | public             | événements, `image_path`, prix minimum et `available_seats`                                                                           |
| GET `/events/{id}`         | public             | fiche et `seats` avec état canonique ; 404 si absent                                                                                  |
| GET `/stream/availability` | public             | SSE `availability`, donnée = ID événement ; relire REST après reconnexion                                                             |
| GET `/seasons`             | public             | saisons proposées                                                                                                                     |
| GET `/seasons/{id}/seats`  | public             | places disponibles pour un abonnement fixe sur les événements de leur salle                                                           |
| POST `/holds`              | client/admin       | `{"eventId":1,"seatIds":[3]}` → `token`, `expiresAt`, `total` ; 1 à 8 places distinctes, 409 si conflit ; tout ou rien                |
| GET `/holds`               | client/admin       | blocages actifs du compte : token, événement, expiration, total et `seat_ids`                                                         |
| DELETE `/holds/{token}`    | client/admin       | libérer son blocage ; 204, ou 409 s’il est absent/terminé ; audit et SSE après commit                                                 |
| POST `/orders`             | client/admin       | clé `Idempotency-Key`, `{"holdToken":"UUID","paymentResult":"success"}` ; `success` ou `decline` uniquement                           |
| GET `/orders`              | client/admin       | commandes du compte ; filtre serveur par propriétaire                                                                                 |
| GET `/tickets`             | connecté           | billets du compte avec code QR ; inclut les droits d’abonnement fixe                                                                  |
| POST `/checkin`            | contrôleur/admin   | `{"code":"UUID","eventId":1}` → `VALID`, `ALREADY_USED`, `WRONG_EVENT`, `CANCELLED`, `INVALID`                                        |
| GET `/passes`              | client/admin       | abonnements du compte                                                                                                                 |
| POST `/passes`             | client/admin       | `{"seasonId":1,"type":"FIXED","seatId":4}` ou `{"seasonId":1,"type":"PRIORITY"}` ; 409 si formule déjà possédée ou place incompatible |
| GET `/admin/venues`        | organisateur/admin | salles existantes et capacités                                                                                                        |
| GET `/admin/seasons`       | organisateur/admin | saisons                                                                                                                               |
| GET `/admin/report`        | organisateur/admin | ventes et places protégées par secteur                                                                                                |
| POST `/admin/events`       | organisateur/admin | création avec plan figé ; 409 si conflit horaire ; droits et billets des abonnés de la salle attribués transactionnellement           |

Une confirmation renvoie par exemple `{"id":12,"status":"PAID","total":350.00}`. La même clé et le même corps renvoient la commande existante. La même clé avec un autre token ou un autre résultat de paiement renvoie `409`. Une clé appartient à un compte et à une intention de commande.

## Création d’événement

```json
{
  "hallId": 1,
  "seasonId": 1,
  "title": "Soirée de démonstration",
  "description": "Événement local",
  "startsAt": "2027-09-10T19:00:00Z",
  "endsAt": "2027-09-10T21:00:00Z",
  "setupMinutes": 60,
  "teardownMinutes": 30,
  "priorityOpensAt": "2026-10-01T09:00:00Z",
  "publicOpensAt": "2026-10-02T09:00:00Z"
}
```

Les instants sont non ambigus. Fin après début, durées positives ou nulles, titre non vide, description bornée et ouverture publique requise. L’ouverture prioritaire ne peut suivre l’ouverture publique ; l’ouverture publique ne peut suivre le début. PostgreSQL impose la non-superposition des périodes occupées. Les catégories tarifaires reprennent les tarifs de démonstration ; leur édition reste une évolution.
