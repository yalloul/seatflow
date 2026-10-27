import { Component, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { ApiService } from "../../core/api.service";
import { Hold, Order } from "../../core/models";
import { errorMessage } from "../../core/notifications.service";
import { EventDatePipe, MadPipe } from "../../shared/format.pipe";

@Component({
  selector: "sf-orders",
  imports: [RouterLink, MadPipe, EventDatePipe],
  template: `
    <section class="section">
      <p class="eyebrow">ESPACE CLIENT</p>
      <h1>Mes commandes</h1>
      @if (loading()) {
        <p role="status">Chargement…</p>
      }
      @if (error()) {
        <div class="error" role="alert">
          {{ error() }}
          <button class="ghost" (click)="load()">Réessayer</button>
        </div>
      }
      @if (holds().length) {
        <h2>Réservations en cours</h2>
        <div class="list">
          @for (hold of holds(); track hold.token) {
            <div class="listRow">
              <strong>{{ hold.title }}</strong
              ><span>Expire le {{ hold.expires_at | eventDate }}</span
              ><span>{{ hold.total | mad }}</span
              ><a
                class="ghost"
                [routerLink]="['/events', hold.event_id]"
                [queryParams]="{ hold: hold.token }"
                >Reprendre</a
              >
            </div>
          }
        </div>
      }
      <div class="list">
        @for (order of orders(); track order.id) {
          <div class="listRow">
            <strong>Commande #{{ order.id }}</strong
            ><a [routerLink]="['/events', order.event_id]"
              >Événement {{ order.event_id }}</a
            ><span>{{ order.total | mad }}</span
            ><span class="pill">{{
              order.status === "PAID" ? "Payée" : "Refusée"
            }}</span>
          </div>
        } @empty {
          @if (!loading() && !error()) {
            <p>Aucune commande pour ce compte.</p>
          }
        }
      </div>
    </section>
  `,
})
export class OrdersComponent {
  private readonly api = inject(ApiService);
  readonly orders = signal<Order[]>([]);
  readonly holds = signal<Hold[]>([]);
  readonly error = signal("");
  readonly loading = signal(true);
  constructor() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set("");
    try {
      const [orders, holds] = await Promise.all([
        this.api.orders(),
        this.api.holds(),
      ]);
      this.orders.set(orders);
      this.holds.set(holds);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
