import { Routes } from "@angular/router";
import { authGuard } from "./core/auth.guard";

export const routes: Routes = [
  { path: "", pathMatch: "full", redirectTo: "events" },
  {
    path: "events",
    title: "Événements · SeatFlow",
    loadComponent: () =>
      import("./features/events/events.component").then(
        (m) => m.EventsComponent,
      ),
  },
  {
    path: "events/:id",
    title: "Réserver · SeatFlow",
    loadComponent: () =>
      import("./features/booking/booking.component").then(
        (m) => m.BookingComponent,
      ),
  },
  {
    path: "login",
    title: "Connexion · SeatFlow",
    loadComponent: () =>
      import("./features/auth/login.component").then((m) => m.LoginComponent),
  },
  {
    path: "orders",
    title: "Mes commandes · SeatFlow",
    canActivate: [authGuard],
    data: { roles: ["CLIENT", "ADMIN"] },
    loadComponent: () =>
      import("./features/orders/orders.component").then(
        (m) => m.OrdersComponent,
      ),
  },
  {
    path: "tickets",
    title: "Mes billets · SeatFlow",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/tickets/tickets.component").then(
        (m) => m.TicketsComponent,
      ),
  },
  {
    path: "passes",
    title: "Abonnements · SeatFlow",
    canActivate: [authGuard],
    data: { roles: ["CLIENT", "ADMIN"] },
    loadComponent: () =>
      import("./features/passes/passes.component").then(
        (m) => m.PassesComponent,
      ),
  },
  {
    path: "admin",
    title: "Organisation · SeatFlow",
    canActivate: [authGuard],
    data: { roles: ["ORGANIZER", "ADMIN"] },
    loadComponent: () =>
      import("./features/admin/admin.component").then((m) => m.AdminComponent),
  },
  {
    path: "checkin",
    title: "Contrôle · SeatFlow",
    canActivate: [authGuard],
    data: { roles: ["CHECKER", "ADMIN"] },
    loadComponent: () =>
      import("./features/checkin/checkin.component").then(
        (m) => m.CheckinComponent,
      ),
  },
  {
    path: "forbidden",
    title: "Accès refusé · SeatFlow",
    data: { forbidden: true },
    loadComponent: () =>
      import("./features/status/status.component").then(
        (m) => m.StatusComponent,
      ),
  },
  {
    path: "**",
    title: "Page introuvable · SeatFlow",
    loadComponent: () =>
      import("./features/status/status.component").then(
        (m) => m.StatusComponent,
      ),
  },
];
