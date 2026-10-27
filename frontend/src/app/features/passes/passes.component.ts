import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ApiService } from "../../core/api.service";
import { Season, SeasonPass, SeasonSeat } from "../../core/models";
import { errorMessage, Notifications } from "../../core/notifications.service";

@Component({
  selector: "sf-passes",
  imports: [ReactiveFormsModule],
  templateUrl: "./passes.component.html",
})
export class PassesComponent {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(Notifications);
  readonly passes = signal<SeasonPass[]>([]);
  readonly seasons = signal<Season[]>([]);
  readonly seats = signal<SeasonSeat[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal("");
  readonly seatsLoading = signal(false);
  readonly form = inject(FormBuilder).group({
    seasonId: [null as number | null, Validators.required],
    type: ["PRIORITY" as "FIXED" | "PRIORITY", Validators.required],
    seatId: [null as number | null],
  });
  private seatRequest = 0;
  constructor() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set("");
    try {
      const [passes, seasons] = await Promise.all([
        this.api.passes(),
        this.api.seasons(),
      ]);
      this.passes.set(passes);
      this.seasons.set(seasons);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
  async loadSeats() {
    const request = ++this.seatRequest;
    const id = this.form.controls.seasonId.value;
    this.form.controls.seatId.reset();
    this.seats.set([]);
    this.seatsLoading.set(!!id);
    if (!id) return;
    try {
      const seats = await this.api.seasonSeats(id);
      if (request === this.seatRequest) this.seats.set(seats);
    } catch (error) {
      if (request === this.seatRequest) this.notifications.error(error);
    } finally {
      if (request === this.seatRequest) this.seatsLoading.set(false);
    }
  }
  async buy() {
    const { seasonId, type, seatId } = this.form.getRawValue();
    if (!seasonId || !type || this.busy() || (type === "FIXED" && !seatId))
      return;
    this.busy.set(true);
    try {
      await this.api.buyPass(seasonId, type, type === "FIXED" ? seatId : null);
      this.notifications.success("Votre abonnement a été créé.");
      await this.load();
      await this.loadSeats();
    } catch (error) {
      this.notifications.error(error);
    } finally {
      this.busy.set(false);
    }
  }
}
