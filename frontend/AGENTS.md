# Frontend SeatFlow — Angular

Le frontend utilise Angular 21, des composants standalone et des templates stricts.

- Organiser les écrans dans `src/app/features`, les services dans `core` et les composants partagés dans `shared`.
- Passer par `ApiService` et `HttpClient` pour les requêtes métier.
- Utiliser les formulaires réactifs pour les saisies et les signals pour l’état d’interface.
- Les guards facilitent la navigation ; les permissions restent contrôlées dans Spring Security.
- Ne jamais stocker de mot de passe dans le navigateur. L’authentification repose sur la session et les cookies CSRF.
- Conserver les images locales et les états de chargement, d’erreur et de données vides.
- Vérifier `npm run build` et `npm test` après une modification fonctionnelle.

Ce fichier remplace les instructions générées par Next.js, devenu obsolète après la migration.
