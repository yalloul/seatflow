import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ApiService } from "../../core/api.service";
import { CheckResult, EventSummary } from "../../core/models";
import { errorMessage } from "../../core/notifications.service";

@Component({
  selector: "sf-checkin",
  imports: [ReactiveFormsModule],
  template: `
    <section class="panel narrow">
      <p class="eyebrow">CONTRÔLE D’ENTRÉE</p>
      <h1>Vérifier un billet</h1>
      <form [formGroup]="form" (ngSubmit)="check()">
        <label
          >Code du billet<input
            formControlName="code"
            placeholder="UUID du QR code"
            autocomplete="off" /></label
        ><label
          >Événement<select formControlName="eventId">
            <option [ngValue]="null">Choisir un événement</option>
            @for (event of events(); track event.id) {
              <option [ngValue]="event.id">{{ event.title }}</option>
            }
          </select></label
        ><button class="primary full" [disabled]="busy() || form.invalid">
          {{ busy() ? "Vérification…" : "Vérifier le billet" }}
        </button>
      </form>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
      @if (result(); as result) {
        <div [class]="'checkResult ' + result" role="status">
          {{ labels[result] }}
        </div>
      }
    </section>
  `,
})
export class CheckinComponent {
  private readonly api = inject(ApiService);
  readonly events = signal<EventSummary[]>([]);
  readonly result = signal<CheckResult | null>(null);
  readonly busy = signal(false);
  readonly error = signal("");
  readonly labels: Record<CheckResult, string> = {
    VALID: "Billet valide — entrée autorisée",
    ALREADY_USED: "Déjà utilisé — entrée refusée",
    WRONG_EVENT: "Ce billet concerne un autre événement",
    CANCELLED: "Billet ou événement annulé",
    INVALID: "Code invalide",
  };
  readonly form = inject(FormBuilder).group({
    code: [
      "",
      [
        Validators.required,
        Validators.pattern(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        ),
      ],
    ],
    eventId: [null as number | null, Validators.required],
  });
  constructor() {
    this.api
      .events()
      .then((events) => this.events.set(events))
      .catch((error) => this.error.set(errorMessage(error)));
  }
  async check() {
    const { code, eventId } = this.form.getRawValue();
    if (!code || !eventId || this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.result.set(null);
    this.error.set("");
    try {
      this.result.set((await this.api.check(code, eventId)).result);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
