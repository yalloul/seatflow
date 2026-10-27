import { Component, inject, signal } from "@angular/core";
import { ApiService } from "../../core/api.service";
import { Ticket } from "../../core/models";
import { errorMessage } from "../../core/notifications.service";
import { QrComponent } from "../../shared/qr.component";

@Component({
  selector: "sf-tickets",
  imports: [QrComponent],
  template: `
    <section class="section">
      <p class="eyebrow">ESPACE CLIENT</p>
      <h1>Mes billets</h1>
      <button class="ghost" (click)="load()" [disabled]="loading()">
        ↻ Actualiser
      </button>
      @if (loading()) {
        <p role="status">Chargement des billets…</p>
      }
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
      <div class="ticketGrid">
        @for (ticket of tickets(); track ticket.id) {
          <article class="ticketCard">
            <p class="eyebrow">SEATFLOW · BILLET #{{ ticket.id }}</p>
            <h2>{{ ticket.title }}</h2>
            <p>Rang {{ ticket.row_label }} · Place {{ ticket.number }}</p>
            <div class="qr"><sf-qr [code]="ticket.code" /></div>
            <code>{{ ticket.code }}</code
            ><span class="pill">{{
              ticket.status === "ACTIVE"
                ? "Valide"
                : ticket.status === "USED"
                  ? "Déjà utilisé"
                  : "Annulé"
            }}</span>
          </article>
        } @empty {
          @if (!loading() && !error()) {
            <p>Aucun billet pour ce compte.</p>
          }
        }
      </div>
    </section>
  `,
})
export class TicketsComponent {
  private readonly api = inject(ApiService);
  readonly tickets = signal<Ticket[]>([]);
  readonly loading = signal(true);
  readonly error = signal("");
  constructor() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set("");
    try {
      this.tickets.set(await this.api.tickets());
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
