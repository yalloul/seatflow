# Comprendre le frontend Angular de SeatFlow

Ce guide décrit le code de la branche `feat/angular-migration`. Angular est le framework du frontend ; TypeScript est toujours le langage. Spring Boot fournit les règles métier et PostgreSQL conserve les données.

## 1. Démarrer sans installer Angular globalement

Depuis la racine :

```sh
docker compose up -d --build
```

Ouvrir http://localhost:5173. Le frontend compilé est servi par Nginx, qui transmet `/api` à Spring Boot. Un rechargement direct sur `/events/1` fonctionne grâce au fallback vers `index.html`.

Pour développer avec rechargement automatique :

```sh
docker compose up -d db api
cd frontend
npm ci
npm start
```

Le serveur Angular écoute sur le port 5173 et `proxy.conf.json` transmet les requêtes au backend sur 8080. Si le conteneur `web` occupe déjà 5173, exécuter d’abord `docker compose stop web` depuis la racine. Les commandes `npm` utilisent le CLI installé dans le projet.

Commandes utiles :

```sh
npm run build
npm test
npx ng generate component features/example
```

`build` compile TypeScript et vérifie les templates. Les fichiers déployables arrivent dans `dist/seatflow/browser`. `test` exécute les cinq tests de régression du plan et des messages d’erreur, avec Vitest et un DOM simulé. Le générateur est un exemple pour tes futurs développements.

## 2. Trouver les fichiers

```text
frontend/
├── angular.json                  configuration du CLI et de la compilation
├── proxy.conf.json               proxy de développement vers Spring Boot
├── nginx.conf                    routes et proxy dans Docker
├── public/images/                les cinq visuels locaux
└── src/
    ├── main.ts                   démarrage de l’application
    ├── styles.css                identité visuelle et responsive
    └── app/
        ├── app.config.ts         configuration HTTP, routes et session initiale
        ├── app.routes.ts         URL et droits de navigation
        ├── app.component.*       en-tête, navigation, notifications, pied de page
        ├── core/
        │   ├── models.ts         contrats TypeScript de l’API
        │   ├── api.service.ts    appels métier HTTP
        │   ├── auth.service.ts   session et rôles
        │   ├── auth.guard.ts     accès aux pages privées
        │   └── availability.service.ts  connexion SSE
        ├── shared/
        │   ├── seat-map.component.ts    plan SVG réutilisable
        │   ├── qr.component.ts          QR à partir du code opaque
        │   └── format.pipe.ts           MAD et dates au Maroc
        └── features/
            ├── events/           catalogue et filtres
            ├── booking/          sélection, blocage, paiement simulé
            ├── auth/             formulaire de connexion
            ├── orders/           commandes et réservations en cours
            ├── tickets/          billets et QR
            ├── passes/           consultation et acquisition des formules
            ├── admin/            ventes, salles et création d’événement
            ├── checkin/          contrôle d’entrée
            └── status/           page absente et accès interdit
```

## 3. Un composant = comportement + vue

Lire `features/events/events.component.ts`, puis son `.html`.

- `@Component` déclare le composant et son template.
- `selector: 'sf-events'` est le nom utilisable comme balise.
- `imports` indique les composants, directives et pipes nécessaires au template.
- La classe TypeScript charge les événements et définit les filtres.
- Le HTML décrit ce que l’utilisateur voit.

Les composants sont **standalone** : on déclare directement leurs imports, sans créer d’`AppModule`. Les écrans sont chargés à la demande avec `loadComponent`.

## 4. Lire les principales syntaxes du template

| Syntaxe réelle                                       | Signification                               |
| ---------------------------------------------------- | ------------------------------------------- |
| `{{ event.title }}`                                  | afficher une valeur                         |
| `[src]="event.image_path"`                           | relier une propriété d’élément à une valeur |
| `(click)="reserve()"`                                | exécuter une méthode lors d’un clic         |
| `[ngModel]="search()"` et `(ngModelChange)`          | lire et mettre à jour un filtre local       |
| `[disabled]="busy()"`                                | désactiver un bouton pendant une opération  |
| `@if (loading()) { ... }`                            | afficher un bloc sous condition             |
| `@for (event of filtered(); track event.id) { ... }` | afficher une liste avec une identité stable |
| `{{ total() \| mad }}`                               | formater une valeur avec un pipe            |
| `[routerLink]="['/events', event.id]"`               | naviguer vers la fiche de l’événement       |
| `[seats]="event.seats"`                              | transmettre les places au composant enfant  |
| `(toggled)="toggle($event)"`                         | recevoir l’identifiant choisi par l’enfant  |

Angular vérifie les types des templates pendant la compilation. Si un contrat d’API change, adapter aussi `core/models.ts`.

## 5. Signals : état réactif de l’écran

Exemple du catalogue :

```ts
readonly events = signal<EventSummary[]>([]);
readonly search = signal('');
```

- `events()` lit la valeur actuelle.
- `events.set(result)` remplace la valeur.
- `selected.update(ids => [...ids, id])` construit une nouvelle sélection.
- `computed(...)` calcule une valeur dérivée : liste filtrée, total ou temps restant.

L’interface se met à jour quand les valeurs utilisées changent. Les signals servent ici à l’état de l’écran ; les données définitives de réservation sont décidées par le backend.

## 6. Services et injection de dépendances

`ApiService` est partagé grâce à `@Injectable({ providedIn: 'root' })`. Un composant l’obtient avec :

```ts
private readonly api = inject(ApiService);
```

La page appelle `this.api.events()` ; le service appelle `HttpClient`. Ainsi, les URL et les contrats HTTP ne sont pas répétés dans chaque écran.

`HttpClient` renvoie des Observables RxJS. Le service utilise `firstValueFrom` pour exposer des Promises aux écrans et garder des méthodes `async/await` simples. Le flux SSE utilise un Observable, car il reçoit plusieurs événements au fil du temps.

`takeUntilDestroyed` arrête les abonnements RxJS quand le composant disparaît. `DestroyRef` nettoie les timers de la réservation. Cela évite qu’un écran quitté continue de déclencher des requêtes.

## 7. Router : une URL par écran

Dans `app.routes.ts`, `/events/:id` ouvre la réservation d’un événement. L’identifiant vient d’`ActivatedRoute`. `router-outlet` affiche le composant de la route courante.

`authGuard` envoie un visiteur vers `/login?returnUrl=...`, puis la connexion le ramène à sa page. Les routes organisateur et contrôleur déclarent les rôles attendus. Le backend vérifie ces mêmes permissions sur ses endpoints.

## 8. Formulaires réactifs

Lire `features/auth/login.component.ts`, puis `features/admin/admin.component.ts`.

`FormBuilder` construit les champs ; `Validators` définit les contraintes. `[formGroup]` relie le formulaire à son modèle, `formControlName` relie chaque champ, et `(ngSubmit)` déclenche l’action.

Le navigateur contrôle les champs requis pour aider l’utilisateur. Spring Boot valide à nouveau les données, et PostgreSQL impose les contraintes de concurrence et de cohérence.

Les horaires `datetime-local` du formulaire organisateur sont saisis dans le fuseau du navigateur puis convertis en instants ISO UTC. L’affichage des événements utilise explicitement `Africa/Casablanca`.

## 9. Connexion : comprendre le trajet

1. Angular appelle `GET /api/auth/csrf` et reçoit le cookie `XSRF-TOKEN`.
2. Le formulaire envoie identifiant et mot de passe à `POST /api/auth/login`.
3. Spring Security vérifie les identifiants et crée la session `JSESSIONID`.
4. Angular renouvelle le jeton CSRF et demande `GET /api/auth/me` pour connaître le compte et ses rôles.
5. Le navigateur envoie le cookie de session sur les requêtes suivantes. Pour les mutations, `HttpClient` ajoute automatiquement `X-XSRF-TOKEN` depuis le cookie CSRF.
6. La déconnexion invalide la session côté serveur.

Le mot de passe n’est enregistré ni dans `localStorage`, ni dans `sessionStorage`. La session est rétablie lors d’un rechargement. Elle est conservée en mémoire du backend : un redémarrage nécessite une nouvelle connexion. Les comptes restent des comptes locaux de démonstration.

## 10. Comprendre la réservation de bout en bout

Lire dans cet ordre :

1. `booking.component.html` : états du panier et actions visibles.
2. `booking.component.ts` : sélection, appel au service, compte à rebours et traitement des erreurs.
3. `seat-map.component.ts` : rendu SVG, clavier et sortie `toggled`.
4. `api.service.ts` : contrats HTTP.
5. `ReservationService.java` : transaction, verrous, expiration et idempotence.
6. `V1__schema.sql`, `V4__angular_workflows.sql` et `V5__fixed_pass_tickets.sql` : garanties en base et évolutions.

Les blocages sont consultés côté serveur à l’ouverture d’une fiche. Quitter la page ne les supprime pas : ils peuvent être repris depuis les commandes, libérés explicitement ou expirer. Chaque confirmation garde sa propre clé d’idempotence dans `sessionStorage`, associée au token de blocage et au résultat demandé. Une nouvelle tentative réutilise la même intention.

Le compte à rebours est un affichage client ; le backend contrôle l’expiration avec l’horloge de PostgreSQL après l’acquisition des verrous. SSE annonce une modification, puis la page relit l’état REST. Un rafraîchissement périodique de dix secondes couvre aussi les expirations sans notification.

## 11. Ce que tu peux expliquer en entretien

- Pourquoi les composants sont séparés par écran et les services par responsabilité.
- La différence entre un signal, un formulaire réactif et un Observable.
- Pourquoi un guard complète le contrôle serveur sans le remplacer.
- Pourquoi la transaction et les contraintes PostgreSQL empêchent la double réservation.
- Pourquoi une nouvelle tentative de paiement doit réutiliser la même clé.
- Pourquoi les billets d’un abonnement fixe sont attribués lors de l’achat et lors de l’ajout d’un événement éligible.
- Pourquoi Nginx doit renvoyer `index.html` pour les routes Angular et désactiver le buffering SSE.

Pour apprendre, commence par modifier un libellé et un filtre du catalogue. Ensuite, lis la réservation. La phase de tests avancés proposée précédemment peut s’appuyer sur cette structure.

## Références officielles

- [Composants Angular](https://angular.dev/guide/components)
- [Signals](https://angular.dev/guide/signals)
- [Injection de dépendances](https://angular.dev/guide/di)
- [Formulaires réactifs](https://angular.dev/guide/forms/reactive-forms)
- [Routes](https://angular.dev/guide/routing/define-routes)
- [Compatibilité des versions](https://angular.dev/reference/versions)
