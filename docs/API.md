# API REST

Base : `http://localhost:8080/api`. Erreurs métier : JSON `{"error":"..."}` ; `400` requête invalide, `401` non authentifié, `403` rôle interdit, `409` conflit. OpenAPI interactif : `/docs`.

| Méthode et URL | Rôle | Requête / réponse | Erreurs et idempotence |
|---|---|---|---|
| GET `/events` | public | liste des événements et prix minimum | — |
| GET `/events/{id}` | public | événement et `seats` avec état canonique | 404 si absent |
| GET `/stream/availability` | public | SSE `availability`, donnée = ID événement | relire REST après reconnexion |
| POST `/holds` | connecté | `{"eventId":1,"seatIds":[3]}` → token, expiration, total | 409 conflit, opération atomique |
| POST `/orders` | connecté | `Idempotency-Key: UUID`, `{"holdToken":"UUID","paymentResult":"success"}` → commande | 409 hold expiré ; clé obligatoire et réutilisable |
| GET `/orders` | connecté | commandes du compte | filtrage par propriétaire |
| GET `/tickets` | connecté | billets du compte avec code QR | filtrage par propriétaire |
| POST `/checkin` | contrôleur/admin | `{"code":"UUID","eventId":1}` → `VALID`, `ALREADY_USED`, `WRONG_EVENT`, `CANCELLED`, `INVALID` | verrou de billet, unique check-in |
| GET `/passes` | connecté | abonnements du compte | filtrage par propriétaire |
| POST `/passes` | connecté | `{"seasonId":1,"type":"FIXED","seatId":4}` ou `PRIORITY` | 409 place incompatible |
| GET `/admin/venues` | organisateur/admin | salles et capacité | 403 |
| GET `/admin/seasons` | organisateur/admin | saisons | 403 |
| GET `/admin/report` | organisateur/admin | ventes par secteur | 403 |
| POST `/admin/events` | organisateur/admin | `NewEvent` avec instants ISO UTC | 409 conflit horaire ou pass |

Exemple de confirmation :

```sh
curl -u client:demo1234 -H 'Content-Type: application/json' -H 'Idempotency-Key: entretien-001' -d '{"holdToken":"TOKEN_REÇU","paymentResult":"success"}' http://localhost:8080/api/orders
```

La clé doit représenter une **intention de commande** ; la réutiliser pour un autre panier renvoie l'ancienne commande. La vérification d'une correspondance entre corps de requête et clé reste à ajouter.
